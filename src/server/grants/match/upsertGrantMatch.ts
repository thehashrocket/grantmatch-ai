import type { Prisma, PrismaClient } from '@/prisma/generated/client';
import {
	SCORING_VERSION,
	computeOrgGrantFitScore,
} from '@/lib/utils/org-grant-scoring';

type PrismaLike = Pick<PrismaClient, 'organization' | 'grant' | 'grantMatch'>;

const BATCH_SIZE = 100;

export async function upsertGrantMatch(params: {
	prisma: PrismaLike;
	organizationId: string | null;
	grantId: string;
}) {
	const { prisma, organizationId, grantId } = params;
	if (!organizationId) return null;

	const organization = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: {
			id: true,
			focusKeywords: true,
			geographyKeywords: true,
			applicantType: true,
			minAward: true,
			maxAward: true,
		},
	});

	if (!organization) return null;

	const grant = await prisma.grant.findUnique({
		where: { id: grantId },
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

	if (!grant) return null;

	const computed = computeOrgGrantFitScore(
		{
			focusKeywords: organization.focusKeywords ?? [],
			geographyKeywords: organization.geographyKeywords ?? [],
			applicantType: organization.applicantType ?? null,
			minAward: organization.minAward ?? null,
			maxAward: organization.maxAward ?? null,
		},
		grant,
	);

	const now = new Date();

	await prisma.grantMatch.upsert({
		where: {
			organizationId_grantId: { organizationId: organization.id, grantId },
		},
		create: {
			organizationId: organization.id,
			grantId,
			fitScore: computed.fitScore,
			version: SCORING_VERSION,
			computedAt: now,
			subscoresJson: computed.subscores as Prisma.InputJsonValue,
			explanation: computed.explanation,
		},
		update: {
			fitScore: computed.fitScore,
			version: SCORING_VERSION,
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
}) {
	const { prisma, organizationId } = params;
	let { grantIds } = params;

	if (!organizationId) {
		return { createdCount: 0, updatedCount: 0 };
	}

	grantIds = Array.from(new Set(grantIds));
	if (grantIds.length === 0) {
		return { createdCount: 0, updatedCount: 0 };
	}

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
		(grantId) => versionByGrant.get(grantId) !== SCORING_VERSION,
	);

	let createdCount = 0;
	let updatedCount = 0;

	for (const batch of chunk(needsUpsert, BATCH_SIZE)) {
		await Promise.all(
			batch.map(async (grantId) => {
				const wasExisting = versionByGrant.has(grantId);
				const result = await upsertGrantMatch({
					prisma,
					organizationId,
					grantId,
				});

				if (!result) return;
				if (wasExisting) {
					updatedCount += 1;
				} else {
					createdCount += 1;
				}
			}),
		);
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
