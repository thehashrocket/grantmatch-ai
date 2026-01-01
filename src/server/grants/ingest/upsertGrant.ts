import {
	Prisma,
	type PrismaClient,
	type Grant,
	type GrantChange,
	type GrantSyncRun,
	type GrantDetail,
	$Enums,
} from '@/prisma/generated/client';
import { diffObjects } from '@/server/grants/ingest/normalize';
import type {
	NormalizedGrantDetail,
	NormalizedGrantInput,
	UpsertResult,
} from '@/server/grants/ingest/types';

type PrismaLike = Pick<PrismaClient, 'grant' | 'grantChange' | 'grantDetail'>;

export async function upsertGrantFromNormalized(
	prisma: PrismaLike,
	run: Pick<GrantSyncRun, 'id' | 'source'>,
	normalized: NormalizedGrantInput,
): Promise<UpsertResult> {
	const existing = await findExistingGrant(prisma, normalized);
	const now = new Date();

	if (!existing) {
		const detailMeta = buildDetailMeta(normalized, now);
		const created = await prisma.grant.create({
			data: { ...toGrantData(normalized), ...detailMeta },
		});
		if (normalized.details) {
			await upsertGrantDetail(
				prisma,
				created.id,
				normalized.details,
				created.title,
			);
		}
		await prisma.grantChange.create({
			data: {
				grantId: created.id,
				runId: run.id,
				changeType: 'CREATED',
				newHash: normalized.contentHash,
				observedAt: now,
			},
		});
		return { created: true };
	}

	const statusTransition = determineStatusTransition(
		existing.status as $Enums.GrantStatus,
		normalized.status,
	);
	const contentChanged = existing.contentHash !== normalized.contentHash;

	const detailMeta = buildDetailMeta(normalized, now);
	if (!contentChanged && !statusTransition.changed) {
		if (normalized.details) {
			await upsertGrantDetail(
				prisma,
				existing.id,
				normalized.details,
				existing.title,
			);
		}
		const metaUpdate = detailMeta ?? {};
		await prisma.grant.update({
			where: { id: existing.id },
			data: {
				lastSeenAt: normalized.lastSeenAt,
				currentAsOf: normalized.currentAsOf,
				...metaUpdate,
			},
		});
		return { unchanged: true };
	}

	const updateData = { ...toGrantData(normalized, existing), ...detailMeta };
	updateData.closedAt =
		normalized.closedAt ?? statusTransition.closedAt ?? existing.closedAt;
	updateData.status = statusTransition.nextStatus ?? normalized.status;

	const beforeDetail = normalized.details
		? await prisma.grantDetail.findUnique({ where: { grantId: existing.id } })
		: null;

	const updated = await prisma.grant.update({
		where: { id: existing.id },
		data: updateData,
	});

	let afterDetailComparable: Record<string, unknown> | null = null;
	if (normalized.details) {
		const detail = await upsertGrantDetail(
			prisma,
			existing.id,
			normalized.details,
			updated.title,
		);
		afterDetailComparable = detail
			? {
					description: detail.description,
					eligibilityRequirements: detail.eligibilityRequirements,
					fundingDetails: detail.fundingDetails,
					purpose: detail.purpose,
				}
			: null;
	}

	const diff = diffObjects(
		mapGrantToComparable(existing),
		mapGrantToComparable(updated),
	);
	const detailDiff = diffObjects(
		beforeDetail
			? {
					description: beforeDetail.description,
					eligibilityRequirements: beforeDetail.eligibilityRequirements,
					fundingDetails: beforeDetail.fundingDetails,
					purpose: beforeDetail.purpose,
				}
			: null,
		afterDetailComparable ?? {},
	);

	const mergedDiff =
		detailDiff && diff
			? { ...diff, details: detailDiff }
			: detailDiff
				? { details: detailDiff }
				: diff;

	const changeType =
		statusTransition.type ?? (contentChanged ? 'UPDATED' : 'STATUS_CHANGED');

	await prisma.grantChange.create({
		data: {
			grantId: existing.id,
			runId: run.id,
			changeType,
			oldHash: existing.contentHash ?? undefined,
			newHash: normalized.contentHash,
			diffJson: (mergedDiff ?? Prisma.JsonNull) as Prisma.InputJsonValue,
			observedAt: now,
		},
	});

	return {
		updated: contentChanged || statusTransition.changed,
		closed: statusTransition.type === 'CLOSED',
		reopened: statusTransition.type === 'REOPENED',
	};
}

async function findExistingGrant(
	prisma: PrismaLike,
	normalized: NormalizedGrantInput,
): Promise<Grant | null> {
	if (normalized.sourceRecordId) {
		const grant = await prisma.grant.findUnique({
			where: {
				source_sourceRecordId: {
					source: normalized.source,
					sourceRecordId: normalized.sourceRecordId,
				},
			},
		});
		if (grant) return grant;
	}

	if (normalized.number) {
		const grant = await prisma.grant.findUnique({
			where: {
				source_number: {
					source: normalized.source,
					number: normalized.number,
				},
			},
		});
		if (grant) return grant;
	}

	if (normalized.sourceKey) {
		const grant = await prisma.grant.findUnique({
			where: {
				source_sourceKey: {
					source: normalized.source,
					sourceKey: normalized.sourceKey,
				},
			},
		});
		if (grant) return grant;
	}

	return null;
}

function determineStatusTransition(
	current: $Enums.GrantStatus,
	next: $Enums.GrantStatus,
): {
	changed: boolean;
	type?: GrantChange['changeType'];
	nextStatus?: $Enums.GrantStatus;
	closedAt?: Date | null;
} {
	if (current === next) return { changed: false };

	if (
		current === $Enums.GrantStatus.OPEN &&
		next === $Enums.GrantStatus.CLOSED
	) {
		return {
			changed: true,
			type: 'CLOSED',
			nextStatus: next,
			closedAt: new Date(),
		};
	}

	if (
		current === $Enums.GrantStatus.CLOSED &&
		next === $Enums.GrantStatus.OPEN
	) {
		return {
			changed: true,
			type: 'REOPENED',
			nextStatus: next,
			closedAt: null,
		};
	}

	return { changed: true, type: 'STATUS_CHANGED', nextStatus: next };
}

function toGrantData(normalized: NormalizedGrantInput, existing?: Grant) {
	const cfdaList =
		normalized.cfdaList ?? (existing?.cfdaList as string[] | undefined);
	return {
		source: normalized.source,
		sourceRecordId: normalized.sourceRecordId,
		sourceKey: normalized.sourceKey,
		number: normalized.number,
		url: normalized.url,
		title: normalized.title,
		deadline: normalized.deadline ?? null,
		openDate: normalized.openDate ?? null,
		stateAgency: normalized.stateAgency,
		matchFunding: normalized.matchFunding,
		estimatedTotalFunding: toBigInt(normalized.estimatedTotalFunding),
		awardFloor: toBigInt(normalized.awardFloor),
		awardCeiling: toBigInt(normalized.awardCeiling),
		estimatedAwardAmounts: normalized.estimatedAwardAmounts,
		fundsDisbursment: normalized.fundsDisbursment,
		currentAsOf: normalized.currentAsOf ?? null,
		grantor: normalized.grantor,
		portalId: normalized.portalId ?? null,
		opportunityType: normalized.opportunityType,
		purpose: normalized.purpose,
		eligibleApplicants: normalized.eligibleApplicants?.join(', ') ?? null,
		eligibleGeographies: normalized.eligibleGeographies ?? null,
		agencyCode: normalized.agencyCode,
		cfdaList: cfdaList ?? undefined,
		contentHash: normalized.contentHash,
		lastSeenAt: normalized.lastSeenAt,
		status: normalized.status,
		closedAt: normalized.closedAt ?? null,
	};
}

function toBigInt(value: number | bigint | null | undefined): bigint | null {
	if (value === undefined || value === null) return null;
	if (typeof value === 'bigint') return value;
	if (Number.isNaN(value)) return null;
	return BigInt(Math.trunc(value));
}

function mapGrantToComparable(grant: Grant) {
	return {
		source: grant.source,
		sourceRecordId: grant.sourceRecordId,
		sourceKey: grant.sourceKey,
		number: grant.number,
		url: grant.url,
		title: grant.title,
		deadline: grant.deadline?.toISOString() ?? null,
		openDate: grant.openDate?.toISOString() ?? null,
		stateAgency: grant.stateAgency,
		matchFunding: grant.matchFunding,
		estimatedTotalFunding: grant.estimatedTotalFunding?.toString() ?? null,
		awardFloor: grant.awardFloor?.toString() ?? null,
		awardCeiling: grant.awardCeiling?.toString() ?? null,
		estimatedAwardAmounts: grant.estimatedAwardAmounts,
		fundsDisbursment: grant.fundsDisbursment,
		currentAsOf: grant.currentAsOf?.toISOString() ?? null,
		grantor: grant.grantor,
		portalId: grant.portalId,
		opportunityType: grant.opportunityType,
		purpose: grant.purpose,
		eligibleApplicants: grant.eligibleApplicants,
		eligibleGeographies: grant.eligibleGeographies,
		agencyCode: grant.agencyCode,
		cfdaList: grant.cfdaList,
		contentHash: grant.contentHash,
		status: grant.status,
		closedAt: grant.closedAt?.toISOString() ?? null,
	};
}

function buildDetailMeta(
	normalized: NormalizedGrantInput,
	now: Date,
):
	| {
			detailsStatus: $Enums.GrantDetailsStatus;
			detailsFetchedAt: Date;
			detailsError: null;
			detailsErrorAt: null;
	  }
	| undefined {
	if (!normalized.details) return undefined;
	const fetchedAt =
		normalized.details.fetchedAt ??
		normalized.currentAsOf ??
		normalized.lastSeenAt ??
		now;
	return {
		detailsStatus: $Enums.GrantDetailsStatus.AVAILABLE,
		detailsFetchedAt: fetchedAt,
		detailsError: null,
		detailsErrorAt: null,
	};
}

async function upsertGrantDetail(
	prisma: PrismaLike,
	grantId: string,
	details: NormalizedGrantDetail,
	fallbackTitle: string,
): Promise<GrantDetail | null> {
	const existing = await prisma.grantDetail.findUnique({ where: { grantId } });
	if (existing) {
		return prisma.grantDetail.update({
			where: { grantId },
			data: {
				title: details.title ?? existing.title ?? fallbackTitle,
				purpose: details.purpose ?? existing.purpose ?? fallbackTitle,
				description: details.description ?? existing.description ?? null,
				eligibilityRequirements: (details.eligibilityRequirements ??
					existing.eligibilityRequirements ??
					null) as Prisma.InputJsonValue,
				fundingDetails: (details.fundingDetails ??
					existing.fundingDetails ??
					null) as Prisma.InputJsonValue,
				fetchedAt:
					details.fetchedAt ??
					existing.fetchedAt ??
					new Date(existing.updatedAt ?? Date.now()),
			},
		});
	}
	return prisma.grantDetail.create({
		data: {
			grantId,
			title: details.title ?? fallbackTitle,
			purpose: details.purpose ?? details.title ?? fallbackTitle,
			description: details.description ?? null,
			eligibilityRequirements: (details.eligibilityRequirements ??
				null) as Prisma.InputJsonValue,
			fundingDetails: (details.fundingDetails ?? null) as Prisma.InputJsonValue,
			fetchedAt: details.fetchedAt ?? new Date(),
		},
	});
}
