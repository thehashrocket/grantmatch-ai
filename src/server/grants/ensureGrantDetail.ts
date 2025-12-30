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

async function atomicClaimGrantDetailFetch(
	prisma: PrismaClient,
	grantId: string,
	now: Date,
	staleBoundary: Date,
	failedRetryBoundary: Date,
): Promise<boolean> {
	const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    UPDATE "Grant"
    SET
      "detailsStatus" = 'FETCHING',
      "detailsFetchedAt" = ${now},
      "detailsError" = NULL,
      "detailsErrorAt" = NULL
    WHERE
      "id" = ${grantId}
      AND (
        "detailsStatus" IS NULL
        OR "detailsStatus" = 'UNKNOWN'
        OR (
          "detailsStatus" = 'FAILED'
          AND "detailsErrorAt" IS NOT NULL
          AND "detailsErrorAt" < ${failedRetryBoundary}
        )
        OR (
          "detailsStatus" = 'FETCHING'
          AND (
            "detailsFetchedAt" IS NULL
            OR "detailsFetchedAt" < ${staleBoundary}
          )
        )
      )
    RETURNING "id"
  `);

	return rows.length > 0;
}

export async function ensureGrantDetail(
	prisma: PrismaClient,
	grantId: string,
	opts: EnsureOpts = {},
): Promise<{ fetched: boolean; error?: string }> {
	const grant = await prisma.grant.findUnique({
		where: { id: grantId },
		include: { details: true, attachments: true },
	});

	if (!grant) return { fetched: false, error: 'not found' };

	const now = new Date();

	if (grant.detailsStatus === $Enums.GrantDetailsStatus.AVAILABLE) {
		return { fetched: false };
	}

	if (
		grant.detailsStatus === $Enums.GrantDetailsStatus.FETCHING &&
		grant.detailsFetchedAt &&
		now.getTime() - grant.detailsFetchedAt.getTime() < FETCH_STALE_MS
	) {
		return { fetched: false };
	}

	if (
		grant.detailsStatus === $Enums.GrantDetailsStatus.FAILED &&
		grant.detailsErrorAt &&
		now.getTime() - grant.detailsErrorAt.getTime() < FAILED_RETRY_TTL_MS
	) {
		return { fetched: false, error: grant.detailsError ?? 'previous failure' };
	}

	const ttl = TTL_MS[grant.source] ?? TTL_MS.DEFAULT;
	const fetchedAt = grant.details?.fetchedAt;
	const isStale = !fetchedAt || Date.now() - fetchedAt.getTime() > ttl;
	if (
		!opts.force &&
		!isStale &&
		grant.detailsStatus !== $Enums.GrantDetailsStatus.FAILED
	) {
		return { fetched: false };
	}

	if (grant.source !== $Enums.GrantSource.FEDERAL) {
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
			return { fetched: false };
		}
		return { fetched: false };
	}

	const staleBoundary = new Date(now.getTime() - FETCH_STALE_MS);
	const failedRetryBoundary = new Date(now.getTime() - FAILED_RETRY_TTL_MS);

	const claimed = await atomicClaimGrantDetailFetch(
		prisma,
		grantId,
		now,
		staleBoundary,
		failedRetryBoundary,
	);

	if (!claimed) {
		return { fetched: false };
	}

	let runId: string | null = null;
	let fetcher: ReturnType<typeof getDetailFetcher> | null = null;
	const observedAt = now;

	try {
		fetcher = getDetailFetcher(grant.source);

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

		return { fetched: true };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		const truncatedMessage = message.slice(0, 500);

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
							from: grant.detailsStatus,
							to: $Enums.GrantDetailsStatus.FAILED,
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

		return { fetched: false, error: message };
	}
}
