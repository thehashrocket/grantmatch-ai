// src/server/grants/match/upsertGrantMatch.ts

import {
	$Enums,
	type Prisma,
	type PrismaClient,
} from '@/prisma/generated/client';
import {
	SCORING_VERSION,
	computeOrgGrantFitScore,
} from '@/lib/utils/org-grant-scoring';
import pLimit from 'p-limit';

export type PrismaLike = Pick<
	PrismaClient,
	'organization' | 'grant' | 'grantMatch'
>;

const BATCH_SIZE = 100;
const DEFAULT_CONCURRENCY = 15;

export type OrganizationForMatch = {
	id: string;
	focusAreas: string[] | null;
	priorityFocusKeywords: string[] | null;
	serviceAreas: string[] | null;
	entityType: $Enums.OrganizationEntityType | null;
	budgetRange: $Enums.BudgetRange | null;
	minAward: number | null;
	maxAward: number | null;
	scoringVersion: number | null;
};

type GrantForMatch = {
	id: string;
	eligibleApplicants: string | null;
	eligibleGeographies: string | null;
	purpose: string | null;
	estimatedTotalFunding: bigint | number | null;
	awardFloor: bigint | number | null;
	awardCeiling: bigint | number | null;
};

export async function upsertGrantMatch(params: {
	prisma: PrismaLike;
	organization: OrganizationForMatch;
	grant: GrantForMatch;
	version: number;
}) {
	const { prisma, organization, grant, version } = params;

	const computed = computeOrgGrantFitScore(
		{
			focusAreas: organization.focusAreas ?? [],
			priorityFocusKeywords: organization.priorityFocusKeywords ?? [],
			serviceAreas: organization.serviceAreas ?? [],
			entityType: organization.entityType ?? null,
			budgetRange: organization.budgetRange ?? null,
			minAward: organization.minAward ?? null,
			maxAward: organization.maxAward ?? null,
		},
		grant,
	);

	const now = new Date();

	const bumped = await prisma.grantMatch.updateMany({
		where: {
			organizationId: organization.id,
			grantId: grant.id,
			fitScore: computed.fitScore,
		},
		data: {
			version,
			computedAt: now,
		},
	});

	if (bumped.count > 0) {
		return computed;
	}

	await prisma.grantMatch.upsert({
		where: {
			organizationId_grantId: {
				organizationId: organization.id,
				grantId: grant.id,
			},
		},
		create: {
			organizationId: organization.id,
			grantId: grant.id,
			fitScore: computed.fitScore,
			version,
			computedAt: now,
			subscoresJson: computed.subscores as Prisma.InputJsonValue,
			explanation: computed.explanation,
		},
		update: {
			fitScore: computed.fitScore,
			version,
			computedAt: now,
			subscoresJson: computed.subscores as Prisma.InputJsonValue,
			explanation: computed.explanation,
		},
	});

	return computed;
}

export async function ensureGrantMatches(params: {
	prisma: PrismaLike;
	organizationId?: string | null;
	organization?: OrganizationForMatch | null;
	grantIds: string[];
	scoringVersion?: number;
	concurrency?: number;
}) {
	const { prisma } = params;
	let { grantIds, scoringVersion } = params;
	const concurrency =
		params.concurrency && params.concurrency > 0
			? params.concurrency
			: DEFAULT_CONCURRENCY;

	grantIds = Array.from(new Set(grantIds));
	if (grantIds.length === 0) {
		return { createdCount: 0, updatedCount: 0 };
	}

	let organization = params.organization ?? null;
	const organizationId = params.organizationId ?? organization?.id ?? null;

	if (!organization && organizationId) {
		organization = (await prisma.organization.findUnique({
			where: { id: organizationId },
			select: {
				id: true,
				focusAreas: true,
				priorityFocusKeywords: true,
				serviceAreas: true,
				entityType: true,
				budgetRange: true,
				minAward: true,
				maxAward: true,
				scoringVersion: true,
			},
		})) as OrganizationForMatch | null;
	}

	if (!organization || !organizationId) {
		return { createdCount: 0, updatedCount: 0 };
	}

	const targetVersion =
		scoringVersion ?? organization.scoringVersion ?? SCORING_VERSION;

	const existingMatches = await prisma.grantMatch.findMany({
		where: {
			organizationId,
			grantId: { in: grantIds },
		},
		select: { grantId: true, version: true },
	});

	const versionByGrant = new Map(
		existingMatches.map((match) => [match.grantId, match.version]),
	);

	const needsUpsert = grantIds.filter(
		(grantId) => versionByGrant.get(grantId) !== targetVersion,
	);

	let createdCount = 0;
	let updatedCount = 0;
	const limit = pLimit(concurrency);

	for (const batch of chunk(needsUpsert, BATCH_SIZE)) {
		const grants = await prisma.grant.findMany({
			where: {
				id: { in: batch },
				status: {
					in: [$Enums.GrantStatus.OPEN, $Enums.GrantStatus.UNKNOWN],
				},
				closedAt: null,
			},
			select: {
				id: true,
				eligibleApplicants: true,
				eligibleGeographies: true,
				purpose: true,
				estimatedTotalFunding: true,
				awardFloor: true,
				awardCeiling: true,
			},
		});

		const results = await Promise.all(
			grants.map((grant) =>
				limit(async () => {
					const wasExisting = versionByGrant.has(grant.id);
					await upsertGrantMatch({
						prisma,
						organization,
						grant,
						version: targetVersion,
					});

					return wasExisting
						? { created: 0, updated: 1 }
						: { created: 1, updated: 0 };
				}),
			),
		);

		for (const result of results) {
			createdCount += result.created;
			updatedCount += result.updated;
		}
	}

	return { createdCount, updatedCount };
}

function chunk<T>(items: T[], size: number): T[][] {
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		batches.push(items.slice(i, i + size));
	}
	return batches;
}
