// src/server/grants/match/tickOrgMatchIndex.ts

import { randomUUID } from 'node:crypto';
import {
	$Enums,
	type Prisma,
	type PrismaClient,
} from '@/prisma/generated/client';
import { ensureGrantMatches } from './upsertGrantMatch';
import { SCORING_VERSION } from '@/lib/utils/org-grant-scoring';

export type OrgTickPrisma = Pick<
	PrismaClient,
	'$queryRaw' | '$transaction' | 'organization' | 'grant' | 'grantMatch'
>;

export type OrgMatchTickSummary = {
	orgId: string;
	status: $Enums.MatchIndexStatus;
	indexedCount: number;
	cursor: string | null;
	claimedAt: Date | null;
	errorsJson: Prisma.JsonValue | null;
	indexedAt: Date | null;
	error: string | null;
	claimId: string | null;
	lastTickAt: Date | null;
	lastTickIndexedDelta: number;
	lastTickRecomputedDelta: number;
};

export type ClaimResult =
	| { claimed: true; organization: OrgMatchTickSummary }
	| {
			claimed: false;
			reason: 'NOT_FOUND' | 'NOT_RUNNING' | 'ALREADY_CLAIMED';
			organization?: OrgMatchTickSummary;
	  };

export type CommitResult =
	| { committed: true; organization: OrgMatchTickSummary }
	| { committed: false; reason: 'STALE_CLAIM' };

export type WorkResult = {
	indexedDelta: number;
	nextCursor: string | null;
	done: boolean;
	errors: unknown[];
	recomputedDelta: number;
};

export const STALE_AFTER_SECONDS = 30;
export const BATCH_SIZE_DEFAULT = 250;
export const MAX_TICK_ERRORS = 20;

const orgSelect = {
	id: true,
	matchIndexStatus: true,
	matchIndexedAt: true,
	matchIndexedCount: true,
	matchIndexCursor: true,
	matchIndexClaimId: true,
	matchIndexClaimedAt: true,
	matchIndexError: true,
	matchIndexErrorJson: true,
	matchIndexLastTickAt: true,
	matchIndexLastTickIndexedDelta: true,
	matchIndexLastTickRecomputedDelta: true,
} satisfies Prisma.OrganizationSelect;

type OrgRow = Prisma.OrganizationGetPayload<{ select: typeof orgSelect }>;

const mapSummary = (org: OrgRow): OrgMatchTickSummary => ({
	orgId: org.id,
	status: org.matchIndexStatus,
	indexedCount: org.matchIndexedCount,
	cursor: org.matchIndexCursor ?? null,
	claimedAt: org.matchIndexClaimedAt,
	errorsJson: org.matchIndexErrorJson ?? null,
	indexedAt: org.matchIndexedAt,
	error: org.matchIndexError ?? null,
	claimId: org.matchIndexClaimId ?? null,
	lastTickAt: org.matchIndexLastTickAt ?? null,
	lastTickIndexedDelta: org.matchIndexLastTickIndexedDelta ?? 0,
	lastTickRecomputedDelta: org.matchIndexLastTickRecomputedDelta ?? 0,
});

export async function startOrgMatchIndex(
	prisma: OrgTickPrisma,
	organizationId: string,
) {
	const org = await prisma.organization.update({
		where: { id: organizationId },
	data: {
		matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
		matchIndexedCount: 0,
		matchIndexedAt: null,
		matchIndexLastTickAt: new Date(),
		matchIndexLastTickIndexedDelta: 0,
		matchIndexLastTickRecomputedDelta: 0,
		matchIndexError: null,
		matchIndexErrorJson: [],
		matchIndexCursor: null,
		matchIndexClaimId: null,
		matchIndexClaimedAt: null,
		},
		select: orgSelect,
	});

	return mapSummary(org);
}

export async function claimOrgMatchIndexTick(
	prisma: OrgTickPrisma,
	organizationId: string,
	staleAfterSeconds = STALE_AFTER_SECONDS,
): Promise<ClaimResult> {
	const claimId = randomUUID();
	const claim = await prisma.$queryRaw<OrgRow[]>`
		UPDATE "Organization"
		SET
			"matchIndexStatus" = ${$Enums.MatchIndexStatus.RUNNING},
			"matchIndexClaimId" = ${claimId},
			"matchIndexClaimedAt" = NOW()
		WHERE "id" = ${organizationId}
			AND ("matchIndexStatus" = ${$Enums.MatchIndexStatus.RUNNING} OR "matchIndexStatus" = ${$Enums.MatchIndexStatus.NOT_STARTED} OR "matchIndexStatus" = ${$Enums.MatchIndexStatus.FAILED})
			AND (
				"matchIndexClaimId" IS NULL
				OR "matchIndexClaimedAt" IS NULL
				OR "matchIndexClaimedAt" < NOW() - (${staleAfterSeconds} * INTERVAL '1 second')
			)
		RETURNING
			"id",
			"matchIndexStatus",
			"matchIndexedAt",
			"matchIndexedCount",
			"matchIndexCursor",
			"matchIndexClaimId",
			"matchIndexClaimedAt",
			"matchIndexError",
			"matchIndexErrorJson",
			"matchIndexLastTickAt",
			"matchIndexLastTickIndexedDelta",
			"matchIndexLastTickRecomputedDelta";
	`;

	if (claim.length > 0) {
		return { claimed: true, organization: mapSummary(claim[0]) };
	}

	const existing = await prisma.organization.findUnique({
		where: { id: organizationId },
		select: orgSelect,
	});

	if (!existing) {
		return { claimed: false, reason: 'NOT_FOUND' };
	}

	if (existing.matchIndexStatus !== $Enums.MatchIndexStatus.RUNNING) {
		return {
			claimed: false,
			reason: 'NOT_RUNNING',
			organization: mapSummary(existing),
		};
	}

	return {
		claimed: false,
		reason: 'ALREADY_CLAIMED',
		organization: mapSummary(existing),
	};
}

export async function performOrgMatchIndexWork(
	prisma: OrgTickPrisma,
	organizationId: string,
	cursorGrantId: string | null,
	batchSize = BATCH_SIZE_DEFAULT,
): Promise<WorkResult> {
	const organization = await prisma.organization.findUnique({
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
	});

	if (!organization) {
		return {
			indexedDelta: 0,
			recomputedDelta: 0,
			nextCursor: cursorGrantId,
			done: true,
			errors: ['ORG_NOT_FOUND'],
		};
	}

	const targetVersion =
		organization.scoringVersion !== null &&
		organization.scoringVersion !== undefined
			? organization.scoringVersion
			: SCORING_VERSION;

	const grants = await prisma.grant.findMany({
		where: {
			status: { in: [$Enums.GrantStatus.OPEN, $Enums.GrantStatus.UNKNOWN] },
			closedAt: null,
			...(cursorGrantId ? { id: { gt: cursorGrantId } } : {}),
		},
		select: { id: true },
		orderBy: { id: 'asc' },
		take: batchSize,
	});

	const grantIds = grants.map((g) => g.id);

	let recomputedDelta = 0;

	if (grantIds.length > 0) {
		const existingMatches = await prisma.grantMatch.findMany({
			where: {
				organizationId,
				grantId: { in: grantIds },
			},
			select: { grantId: true, version: true },
		});

		const existingByGrant = new Map(
			existingMatches.map((m) => [m.grantId, m.version]),
		);

		const needsUpsert = grantIds.filter((id) => {
			const matchVersion = existingByGrant.get(id);
			return matchVersion !== targetVersion;
		});

		if (needsUpsert.length > 0) {
			const result = await ensureGrantMatches({
				prisma,
				organization,
				grantIds: needsUpsert,
				scoringVersion: targetVersion,
			});
			recomputedDelta =
				(result?.createdCount ?? 0) + (result?.updatedCount ?? 0);
		}
	}

	const nextCursor =
		grantIds.length === 0 ? null : grantIds[grantIds.length - 1];

	return {
		indexedDelta: grantIds.length,
		recomputedDelta,
		nextCursor,
		done: grantIds.length === 0 || grantIds.length < batchSize,
		errors: [],
	};
}

export async function commitOrgMatchIndexTick(
	prisma: OrgTickPrisma,
	args: {
		organizationId: string;
		claimId: string;
		indexedDelta: number;
		recomputedDelta?: number;
		nextCursor: string | null;
		done: boolean;
		errors?: unknown[];
		failedMessage?: string | null;
	},
): Promise<CommitResult> {
	const errors = (args.errors ?? []).slice(0, MAX_TICK_ERRORS);

	const result = await prisma.$transaction(async (tx) => {
		const current = await tx.organization.findUnique({
			where: { id: args.organizationId },
			select: orgSelect,
		});

		if (!current || current.matchIndexClaimId !== args.claimId) {
			return { committed: false as const, reason: 'STALE_CLAIM' as const };
		}

		const eligibleCount =
			!args.failedMessage && args.done
				? await tx.grant.count({
						where: {
							status: {
								in: [$Enums.GrantStatus.OPEN, $Enums.GrantStatus.UNKNOWN],
							},
							closedAt: null,
						},
					})
				: 0;

		const existingErrors = Array.isArray(current.matchIndexErrorJson)
			? (current.matchIndexErrorJson as unknown[])
			: [];
		const mergedErrors = [...existingErrors, ...errors].slice(
			0,
			MAX_TICK_ERRORS,
		);

		const totalIndexed =
			(current.matchIndexedCount ?? 0) + (args.indexedDelta ?? 0);

		const data: Prisma.OrganizationUpdateInput = {
			matchIndexedCount: {
				increment: args.indexedDelta,
			},
			matchIndexCursor: args.done ? null : args.nextCursor,
			matchIndexErrorJson: mergedErrors as Prisma.InputJsonValue,
			matchIndexClaimId: null,
			matchIndexClaimedAt: null,
			matchIndexLastTickAt: new Date(),
			matchIndexLastTickIndexedDelta: args.indexedDelta,
			matchIndexLastTickRecomputedDelta: args.recomputedDelta ?? 0,
		};

		if (args.failedMessage) {
			data.matchIndexStatus = $Enums.MatchIndexStatus.FAILED;
			data.matchIndexError = args.failedMessage;
		} else {
			data.matchIndexError = null;
			if (args.done) {
				if (totalIndexed === 0 && eligibleCount > 0) {
					data.matchIndexStatus = $Enums.MatchIndexStatus.FAILED;
					data.matchIndexError = 'INDEX_COMPLETE_WITH_ZERO_PROGRESS';
				} else {
					data.matchIndexStatus = $Enums.MatchIndexStatus.COMPLETE;
					data.matchIndexedAt = new Date();
				}
			} else {
				data.matchIndexStatus = $Enums.MatchIndexStatus.RUNNING;
			}
		}

		const updated = await tx.organization.update({
			where: { id: args.organizationId },
			data,
			select: orgSelect,
		});

		return { committed: true as const, organization: mapSummary(updated) };
	});

	return result as CommitResult;
}

export async function runOrgMatchIndexTick(
	prisma: OrgTickPrisma,
	organizationId: string,
	opts?: { staleAfterSeconds?: number; batchSize?: number },
) {
	const claim = await claimOrgMatchIndexTick(
		prisma,
		organizationId,
		opts?.staleAfterSeconds ?? STALE_AFTER_SECONDS,
	);

	if (!claim.claimed) {
		return { claimed: false as const, claim };
	}

	try {
		const work = await performOrgMatchIndexWork(
			prisma,
			organizationId,
			claim.organization.cursor,
			opts?.batchSize ?? BATCH_SIZE_DEFAULT,
		);

		const commit = await commitOrgMatchIndexTick(prisma, {
			organizationId,
			claimId: claim.organization.claimId ?? '',
			indexedDelta: work.indexedDelta,
			nextCursor: work.nextCursor,
			done: work.done,
			errors: work.errors,
			recomputedDelta: work.recomputedDelta,
		});

		return { claimed: true as const, claim: claim.organization, work, commit };
	} catch (error) {
		await commitOrgMatchIndexTick(prisma, {
			organizationId,
			claimId: claim.organization.claimId ?? '',
			indexedDelta: 0,
			nextCursor: claim.organization.cursor,
			done: false,
			errors: [error instanceof Error ? error.message : 'Unknown error'],
			failedMessage: error instanceof Error ? error.message : 'Unknown error',
		});
		throw error;
	}
}

export async function runOrgMatchIndexToCompletion(
	prisma: OrgTickPrisma,
	organizationId: string,
	opts?: { maxTicks?: number; batchSize?: number; start?: boolean },
) {
	const maxTicks = opts?.maxTicks ?? 20;
	if (opts?.start ?? true) {
		await startOrgMatchIndex(prisma, organizationId);
	}

	let last: Awaited<ReturnType<typeof runOrgMatchIndexTick>> | null = null;

	for (let i = 0; i < maxTicks; i += 1) {
		last = await runOrgMatchIndexTick(prisma, organizationId, {
			batchSize: opts?.batchSize,
		});

		if (!last.claimed) {
			break;
		}

		const status =
			last.commit?.committed === true
				? last.commit.organization.status
				: last.claim.status;

		if (
			status === $Enums.MatchIndexStatus.COMPLETE ||
			status === $Enums.MatchIndexStatus.FAILED
		) {
			break;
		}
	}

	return last;
}
