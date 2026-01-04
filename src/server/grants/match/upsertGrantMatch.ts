// src/server/grants/match/upsertGrantMatch.ts

import type { Prisma, PrismaClient, $Enums } from '@/prisma/generated/client';
import {
	SCORING_VERSION,
	computeOrgGrantFitScore,
} from '@/lib/utils/org-grant-scoring';

type PrismaLike = Pick<PrismaClient, 'organization' | 'grant' | 'grantMatch'>;

const BATCH_SIZE = 100;

type OrganizationForMatch = {
	id: string;
	focusAreas: string[] | null;
	priorityFocusKeywords: string[] | null;
	serviceAreas: string[] | null;
	entityType: Prisma.OrganizationWhereInput['entityType'];
	budgetRange: Prisma.OrganizationWhereInput['budgetRange'];
	preferredAwardMin: number | null;
	preferredAwardMax: number | null;
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
			entityType:
				(organization.entityType as $Enums.OrganizationEntityType | null) ??
				null,
			budgetRange:
				(organization.budgetRange as $Enums.BudgetRange | null) ?? null,
			preferredAwardMin: organization.preferredAwardMin ?? null,
			preferredAwardMax: organization.preferredAwardMax ?? null,
		},
		grant,
	);

	const now = new Date();

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
	organizationId: string | null;
	grantIds: string[];
	scoringVersion?: number;
}) {
	const { prisma, organizationId } = params;
	let { grantIds, scoringVersion } = params;

	if (!organizationId) {
		return { createdCount: 0, updatedCount: 0 };
	}

	grantIds = Array.from(new Set(grantIds));
	if (grantIds.length === 0) {
		return { createdCount: 0, updatedCount: 0 };
	}

	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: {
			id: true,
			focusAreas: true,
			priorityFocusKeywords: true,
			serviceAreas: true,
			entityType: true,
			budgetRange: true,
			preferredAwardMin: true,
			preferredAwardMax: true,
			scoringVersion: true,
		} as unknown as Prisma.OrganizationSelect,
	}) as (typeof prisma.organization)['findUnique'] extends (...args: any[]) => Promise<
		infer R
	>
		? (R extends null ? null : R & { priorityFocusKeywords?: string[] })
		: null;

	if (!organization) {
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

	for (const batch of chunk(needsUpsert, BATCH_SIZE)) {
		const grants = await prisma.grant.findMany({
			where: { id: { in: batch } },
			select: {
				id: true,
				eligibleApplicants: true,
				eligibleGeographies: true,
				purpose: true,
				estimatedTotalFunding: true,
				awardFloor: true,
				awardCeiling: true,
				details: {
					select: { purpose: true },
				},
			},
		});

		const results = await Promise.all(
			grants.map(async (grant) => {
				const wasExisting = versionByGrant.has(grant.id);
				const { details, ...baseGrant } = grant;
				const grantForMatch: GrantForMatch = {
					...baseGrant,
					purpose: details?.purpose ?? grant.purpose ?? null,
				};
				await upsertGrantMatch({
					prisma,
					organization: {
						...organization,
						priorityFocusKeywords:
							(organization as { priorityFocusKeywords?: string[] })
								.priorityFocusKeywords ?? [],
					},
					grant: grantForMatch,
					version: targetVersion,
				});

				return wasExisting
					? { created: 0, updated: 1 }
					: { created: 1, updated: 0 };
			}),
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
