import { randomUUID } from 'node:crypto';
import {
	$Enums,
	type Prisma,
	type PrismaClient,
} from '@/prisma/generated/client';
import { ensureGrantMatches } from './upsertGrantMatch';

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
			"matchIndexErrorJson";
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
		select: { scoringVersion: true },
	});

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

	if (grantIds.length > 0) {
		await ensureGrantMatches({
			prisma,
			organizationId,
			grantIds,
			scoringVersion: organization?.scoringVersion ?? undefined,
		});
	}

	const nextCursor =
		grantIds.length === 0 ? null : grantIds[grantIds.length - 1];

	return {
		indexedDelta: grantIds.length,
		nextCursor,
		done: grantIds.length === 0,
		errors: [],
	};
}

export async function commitOrgMatchIndexTick(
	prisma: OrgTickPrisma,
	args: {
		organizationId: string;
		claimId: string;
		indexedDelta: number;
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

		const existingErrors = Array.isArray(current.matchIndexErrorJson)
			? (current.matchIndexErrorJson as unknown[])
			: [];
		const mergedErrors = [...existingErrors, ...errors].slice(
			0,
			MAX_TICK_ERRORS,
		);

		const data: Prisma.OrganizationUpdateInput = {
			matchIndexedCount: {
				increment: args.indexedDelta,
			},
			matchIndexCursor: args.done ? null : args.nextCursor,
			matchIndexErrorJson: mergedErrors as Prisma.InputJsonValue,
			matchIndexClaimId: null,
			matchIndexClaimedAt: null,
		};

		if (args.failedMessage) {
			data.matchIndexStatus = $Enums.MatchIndexStatus.FAILED;
			data.matchIndexError = args.failedMessage;
		} else {
			data.matchIndexError = null;
			if (args.done) {
				data.matchIndexStatus = $Enums.MatchIndexStatus.COMPLETE;
				data.matchIndexedAt = new Date();
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
