// src/server/grants/ensureGrantDetail.ts

import { diffObjects } from '@/server/grants/ingest/normalize';
import { getDetailFetcher } from '@/server/grants/details/fetchers';
import type { GrantWithRelations } from '@/server/grants/details/types';
import { type PrismaClient, Prisma, $Enums } from '@/prisma/generated/client';

const TTL_MS: Record<$Enums.GrantSource | 'DEFAULT', number> = {
	[$Enums.GrantSource.FEDERAL]: 1000 * 60 * 60 * 24 * 7,
	[$Enums.GrantSource.CALIFORNIA]: 1000 * 60 * 60 * 24 * 30,
	[$Enums.GrantSource.OHIO]: 1000 * 60 * 60 * 24 * 7,
	[$Enums.GrantSource.OTHER]: 1000 * 60 * 60 * 24 * 7,
	DEFAULT: 1000 * 60 * 60 * 24 * 7,
};

export const FETCH_STALE_MS = 1000 * 60 * 2;
export const FAILED_RETRY_TTL_MS = 1000 * 60 * 60 * 6;

type EnsureOpts = { timeoutMs?: number; force?: boolean };

function toOneLineJson(payload: Record<string, unknown>): string {
	try {
		return JSON.stringify(payload);
	} catch {
		return JSON.stringify({
			event: 'grant_details.ensure',
			decision: 'serialize_failed',
		});
	}
}

function logEnsure(
	level: 'info' | 'warn' | 'error',
	payload: Record<string, unknown>,
) {
	const line = toOneLineJson(payload);
	if (level === 'info') console.info(line);
	else if (level === 'warn') console.warn(line);
	else console.error(line);
}

// Uses detailsFetchedAt as the FETCHING heartbeat; stale values allow reclaim.
async function atomicClaimGrantDetailFetch(
	prisma: PrismaClient,
	grantId: string,
	now: Date,
	staleBoundary: Date,
	failedRetryBoundary: Date,
): Promise<{ claimed: boolean; prevStatus: string | null }> {
	// CTE locks eligible row; SKIP LOCKED ensures concurrent callers don’t block and only one claims.
	const rows = await prisma.$queryRaw<
		{ id: string; prevStatus: string | null }[]
	>(Prisma.sql`
    WITH eligible AS (
      SELECT "id", "detailsStatus" AS "prevStatus"
      FROM "Grant"
      WHERE
        "id" = ${grantId}
        AND (
          "detailsStatus" IS NULL
          OR "detailsStatus" = 'UNKNOWN'
          OR (
            "detailsStatus" = 'FAILED'
            AND ("detailsErrorAt" IS NULL OR "detailsErrorAt" < ${failedRetryBoundary})
          )
          OR (
            "detailsStatus" = 'FETCHING'
            AND (
              "detailsFetchedAt" IS NULL
              OR "detailsFetchedAt" < ${staleBoundary}
            )
          )
        )
      ORDER BY "id"
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE "Grant" AS g
    SET
      "detailsStatus" = 'FETCHING',
      "detailsFetchedAt" = ${now},
      "detailsError" = NULL,
      "detailsErrorAt" = NULL
    FROM eligible
    WHERE g."id" = eligible."id"
    RETURNING eligible."prevStatus" AS "prevStatus", eligible."id" AS "id"
  `);

	if (!rows.length) {
		return { claimed: false, prevStatus: null };
	}

	return { claimed: true, prevStatus: rows[0].prevStatus ?? null };
}

export async function ensureGrantDetail(
	prisma: PrismaClient,
	grantId: string,
	opts: EnsureOpts = {},
): Promise<{ fetched: boolean; error?: string }> {
	const t0 = Date.now();
	const grant = await prisma.grant.findUnique({
		where: { id: grantId },
		include: { details: true, attachments: true },
	});

	if (!grant) return { fetched: false, error: 'not found' };

	const now = new Date();
	const force = opts.force ?? false;
	const supportsDetailFetch =
		grant.source === $Enums.GrantSource.FEDERAL ||
		grant.source === $Enums.GrantSource.CALIFORNIA;

	if (grant.detailsStatus === $Enums.GrantDetailsStatus.AVAILABLE) {
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'skip_available',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'status_available',
			status: grant.detailsStatus ?? null,
			prevStatus: grant.detailsStatus ?? null,
			detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			force,
		});
		return { fetched: false };
	}

	if (
		grant.detailsStatus === $Enums.GrantDetailsStatus.FETCHING &&
		grant.detailsFetchedAt &&
		now.getTime() - grant.detailsFetchedAt.getTime() < FETCH_STALE_MS
	) {
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'skip_fetching_recent',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'fetching_recent',
			status: grant.detailsStatus ?? null,
			prevStatus: grant.detailsStatus ?? null,
			detailsFetchedAt: grant.detailsFetchedAt.toISOString(),
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			force,
		});
		return { fetched: false };
	}

	if (
		grant.detailsStatus === $Enums.GrantDetailsStatus.FAILED &&
		grant.detailsErrorAt &&
		now.getTime() - grant.detailsErrorAt.getTime() < FAILED_RETRY_TTL_MS
	) {
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'skip_failed_recent',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'failed_recent',
			status: grant.detailsStatus ?? null,
			prevStatus: grant.detailsStatus ?? null,
			detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt.toISOString(),
			error: (grant.detailsError ?? '').slice(0, 500) || undefined,
			force,
		});
		return { fetched: false, error: grant.detailsError ?? 'previous failure' };
	}

	const ttl = TTL_MS[grant.source] ?? TTL_MS.DEFAULT;
	const fetchedAt = grant.details?.fetchedAt;
	const isStale = !fetchedAt || Date.now() - fetchedAt.getTime() > ttl;
	if (
		!force &&
		!isStale &&
		grant.detailsStatus !== $Enums.GrantDetailsStatus.FAILED
	) {
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'skip_not_stale',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'details_fresh',
			status: grant.detailsStatus ?? null,
			prevStatus: grant.detailsStatus ?? null,
			detailsFetchedAt: fetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			ttlMs: ttl,
			isStale: false,
			force,
		});
		return { fetched: false };
	}

	if (!supportsDetailFetch) {
		if (grant.details) {
			await prisma.grant
				.update({
					where: { id: grantId },
					data: {
						detailsStatus: $Enums.GrantDetailsStatus.AVAILABLE,
						detailsFetchedAt: grant.details.fetchedAt ?? now,
						detailsError: null,
						detailsErrorAt: null,
					},
				})
				.catch(() => {});
			logEnsure('info', {
				event: 'grant_details.ensure',
				decision: 'skip_unsupported_source_mark_available',
				grantId,
				source: grant.source,
				now: now.toISOString(),
				reason: 'unsupported_source_existing_details',
				status: grant.detailsStatus ?? null,
				prevStatus: grant.detailsStatus ?? null,
				detailsFetchedAt: grant.details.fetchedAt?.toISOString() ?? null,
				detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
				force,
			});
			return { fetched: false };
		}
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'skip_unsupported_source_no_details',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'unsupported_source_no_details',
			status: grant.detailsStatus ?? null,
			prevStatus: grant.detailsStatus ?? null,
			detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			force,
		});
		return { fetched: false };
	}

	const staleBoundary = new Date(now.getTime() - FETCH_STALE_MS);
	const failedRetryBoundary = new Date(now.getTime() - FAILED_RETRY_TTL_MS);

	const { claimed, prevStatus } = await atomicClaimGrantDetailFetch(
		prisma,
		grantId,
		now,
		staleBoundary,
		failedRetryBoundary,
	);

	if (!claimed) {
		logEnsure('warn', {
			event: 'grant_details.ensure',
			decision: 'claim_miss',
			grantId,
			source: grant.source,
			now: now.toISOString(),
			reason: 'not_eligible_or_locked',
			status: grant.detailsStatus ?? null,
			prevStatus,
			detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			force,
			staleBoundary: staleBoundary.toISOString(),
			failedRetryBoundary: failedRetryBoundary.toISOString(),
		});
		return { fetched: false };
	}

	logEnsure('info', {
		event: 'grant_details.ensure',
		decision: 'claim_success',
		grantId,
		source: grant.source,
		now: now.toISOString(),
		reason: 'claimed',
		status: grant.detailsStatus ?? null,
		prevStatus,
		detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
		detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
		force,
		staleBoundary: staleBoundary.toISOString(),
		failedRetryBoundary: failedRetryBoundary.toISOString(),
	});

	let runId: string | null = null;
	let fetcher: ReturnType<typeof getDetailFetcher> | null = null;
	const observedAt = now;
	let tFetch0: number | null = null;

	try {
		fetcher = getDetailFetcher(grant.source);
		tFetch0 = Date.now();

		const run = await prisma.grantSyncRun.create({
			data: {
				source: grant.source,
				status: $Enums.ImportStatus.IN_PROGRESS,
				schemaJson: {
					kind: 'on_demand_details',
					source: grant.source,
					endpoint: fetcher.endpoint,
				},
				recordsFetched: 0,
				createdCount: 0,
				updatedCount: 0,
				unchangedCount: 0,
				closedCount: 0,
				reopenedCount: 0,
			},
		});
		runId = run.id;

		const beforeDetails = grant.details
			? {
					description: grant.details.description,
					eligibilityRequirements: grant.details.eligibilityRequirements,
					fundingDetails: grant.details.fundingDetails,
					purpose: grant.details.purpose,
					synopsisHtml: grant.details.synopsisHtml,
					applicantEligibilityDesc: grant.details.applicantEligibilityDesc,
					fundingDescLinkUrl: grant.details.fundingDescLinkUrl,
					responseDateDesc: grant.details.responseDateDesc,
					rawJson: grant.details.rawJson,
				}
			: null;

		const result = await fetcher.fetch(grant as GrantWithRelations, {
			timeoutMs: opts.timeoutMs,
		});
		const detailData: Partial<Prisma.GrantDetailUncheckedCreateInput> = {
			...result.detail,
			fetchedAt: result.detail.fetchedAt ?? observedAt,
			rawJson:
				result.detail.rawJson ??
				(result.raw as Prisma.InputJsonValue | undefined) ??
				undefined,
		};

		await prisma.$transaction(async (tx) => {
			await tx.grantDetail.upsert({
				where: { grantId },
				create: { ...detailData, grantId },
				update: detailData,
			});

			await tx.grantAttachment.deleteMany({ where: { grantId } });
			if (result.attachments.length) {
				await tx.grantAttachment.createMany({
					data: result.attachments.map((attachment) => ({
						...attachment,
						grantId,
					})),
				});
			}

			const grantUpdateData: Prisma.GrantUncheckedUpdateInput = {
				detailsStatus: $Enums.GrantDetailsStatus.AVAILABLE,
				detailsFetchedAt: detailData.fetchedAt ?? observedAt,
				detailsError: null,
				detailsErrorAt: null,
			};

			if (result.grantPatch && Object.keys(result.grantPatch).length > 0) {
				Object.assign(grantUpdateData, result.grantPatch);
			}

			await tx.grant.update({
				where: { id: grantId },
				data: grantUpdateData,
			});
		});

		const afterDetails = {
			description: detailData.description ?? null,
			eligibilityRequirements: detailData.eligibilityRequirements ?? null,
			fundingDetails: detailData.fundingDetails ?? null,
			purpose: detailData.purpose ?? null,
			synopsisHtml: detailData.synopsisHtml ?? null,
			applicantEligibilityDesc: detailData.applicantEligibilityDesc ?? null,
			fundingDescLinkUrl: detailData.fundingDescLinkUrl ?? null,
			responseDateDesc: detailData.responseDateDesc ?? null,
			rawJson: detailData.rawJson ?? null,
		};

		const diff = diffObjects(beforeDetails, afterDetails) ?? {};
		const afterUrl =
			(result.grantPatch?.url as string | null | undefined) ?? grant.url;
		const afterCurrentAsOf =
			(result.grantPatch?.currentAsOf as Date | null | undefined) ??
			grant.currentAsOf;
		const afterStatus =
			(result.grantPatch?.status as $Enums.GrantStatus | undefined) ??
			grant.status;

		if (result.grantPatch?.url !== undefined && grant.url !== afterUrl) {
			diff.url = { before: grant.url, after: afterUrl };
		}
		if (
			result.grantPatch?.currentAsOf !== undefined &&
			grant.currentAsOf?.getTime() !== afterCurrentAsOf?.getTime()
		) {
			diff.currentAsOf = {
				before: grant.currentAsOf,
				after: afterCurrentAsOf,
			};
		}
		if (
			result.grantPatch?.status !== undefined &&
			grant.status !== afterStatus
		) {
			diff.status = { before: grant.status, after: afterStatus };
		}

		await prisma.grantChange.create({
			data: {
				grantId,
				runId: run.id,
				changeType: 'DETAILS_FETCHED',
				oldHash: grant.contentHash ?? undefined,
				newHash: grant.contentHash ?? undefined,
				diffJson: Object.keys(diff).length
					? (diff as Prisma.InputJsonValue)
					: Prisma.JsonNull,
				observedAt,
			},
		});

		await prisma.grantSyncRun.update({
			where: { id: run.id },
			data: {
				status: $Enums.ImportStatus.COMPLETED,
				finishedAt: new Date(),
				recordsFetched: 1,
				updatedCount: 1,
			},
		});

		const fetchMs = tFetch0 ? Date.now() - tFetch0 : 0;
		const totalMs = Date.now() - t0;
		logEnsure('info', {
			event: 'grant_details.ensure',
			decision: 'fetch_success',
			grantId,
			source: grant.source,
			now: new Date().toISOString(),
			reason: 'ok',
			status: grant.detailsStatus ?? null,
			prevStatus,
			detailsFetchedAt: (detailData.fetchedAt instanceof Date
				? detailData.fetchedAt
				: new Date(detailData.fetchedAt ?? observedAt)
			).toISOString(),
			detailsErrorAt: null,
			force,
			fetchMs,
			totalMs,
			attachmentsCount: result.attachments.length,
			hasGrantPatch: !!(
				result.grantPatch && Object.keys(result.grantPatch).length
			),
		});

		return { fetched: true };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		const truncatedMessage = message.slice(0, 500);
		const fetchMs = tFetch0 ? Date.now() - tFetch0 : 0;
		const totalMs = Date.now() - t0;

		await prisma.grant
			.update({
				where: { id: grantId },
				data: {
					detailsStatus: $Enums.GrantDetailsStatus.FAILED,
					detailsError: truncatedMessage,
					detailsErrorAt: new Date(),
				},
			})
			.catch(() => {});

		if (runId) {
			await prisma.grantChange.create({
				data: {
					grantId,
					runId,
					changeType: 'DETAILS_FETCH_FAILED',
					oldHash: grant.contentHash ?? undefined,
					newHash: grant.contentHash ?? undefined,
					diffJson: {
						message,
						source: grant.source,
						endpoint: fetcher?.endpoint ?? 'unknown',
						status: {
							from: prevStatus ?? grant.detailsStatus ?? null,
							to: 'FAILED',
						},
					} as Prisma.InputJsonValue,
					observedAt,
				},
			});

			await prisma.grantSyncRun.update({
				where: { id: runId },
				data: {
					status: $Enums.ImportStatus.FAILED,
					finishedAt: new Date(),
					errorsJson: [{ message }] as Prisma.InputJsonValue,
				},
			});
		}

		logEnsure('error', {
			event: 'grant_details.ensure',
			decision: 'fetch_failed',
			grantId,
			source: grant.source,
			now: new Date().toISOString(),
			reason: 'exception',
			status: grant.detailsStatus ?? null,
			prevStatus,
			detailsFetchedAt: grant.detailsFetchedAt?.toISOString() ?? null,
			detailsErrorAt: grant.detailsErrorAt?.toISOString() ?? null,
			force,
			fetchMs,
			totalMs,
			error: truncatedMessage,
		});

		return { fetched: false, error: message };
	}
}
