import { describe, expect, it, vi, beforeEach } from 'vitest';
import { $Enums } from '@/prisma/generated/client';
import {
	BATCH_SIZE_DEFAULT,
	claimOrgMatchIndexTick,
	commitOrgMatchIndexTick,
	performOrgMatchIndexWork,
	runOrgMatchIndexTick,
	type OrgTickPrisma,
} from './tickOrgMatchIndex';

vi.mock('./upsertGrantMatch', () => ({
	ensureGrantMatches: vi.fn(async ({ grantIds }: { grantIds: string[] }) => ({
		createdCount: grantIds.length,
		updatedCount: 0,
	})),
}));

type OrgState = {
	id: string;
	matchIndexStatus: $Enums.MatchIndexStatus;
	matchIndexedCount: number;
	matchIndexCursor: string | null;
	matchIndexClaimId: string | null;
	matchIndexClaimedAt: Date | null;
	matchIndexError: string | null;
	matchIndexErrorJson: unknown[] | null;
	matchIndexedAt: Date | null;
	scoringVersion: number | null;
};

const cloneOrg = (org: OrgState) => ({ ...org });

const pickSelected = (
	record: Record<string, unknown>,
	select?: Record<string, boolean>,
) => {
	if (!select) return record;
	const result: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(select)) {
		if (value) result[key] = record[key];
	}
	return result;
};

const applyUpdate = (org: OrgState, data: Record<string, unknown>) => {
	for (const [key, value] of Object.entries(data)) {
		if (
			key === 'matchIndexedCount' &&
			value &&
			typeof value === 'object' &&
			'increment' in value
		) {
			const increment = (value as { increment?: number }).increment ?? 0;
			org.matchIndexedCount += increment;
		} else {
			// @ts-expect-error dynamic assign
			org[key] = value as never;
		}
	}
	return org;
};

function createPrismaMock(state: {
	org: OrgState;
	grants: { id: string; status: $Enums.GrantStatus; closedAt: Date | null }[];
	grantMatches?: { grantId: string; version: number }[];
}) {
	let currentOrganizationId: string | null = null;

	const prisma = {
		$queryRaw: vi.fn(async () => {
			const org = state.org.id === currentOrganizationId ? state.org : null;
			if (!org) return [];

			const now = new Date();
			const staleCutoff = new Date(now.getTime() - 30_000);
			const isStale =
				!org.matchIndexClaimedAt || org.matchIndexClaimedAt < staleCutoff;

			if (
				(org.matchIndexStatus === $Enums.MatchIndexStatus.RUNNING ||
					org.matchIndexStatus === $Enums.MatchIndexStatus.NOT_STARTED ||
					org.matchIndexStatus === $Enums.MatchIndexStatus.FAILED) &&
				(!org.matchIndexClaimId || isStale)
			) {
				org.matchIndexStatus = $Enums.MatchIndexStatus.RUNNING;
				org.matchIndexClaimId = 'claim-1';
				org.matchIndexClaimedAt = now;
				return [cloneOrg(org)];
			}

			return [];
		}),
		$transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
			fn(prisma),
		),
		organization: {
			findUnique: vi.fn(
				async ({
					where,
					select,
				}: {
					where: { id: string };
					select?: Record<string, boolean>;
				}) => {
					if (where.id !== state.org.id) return null;
					const snapshot = cloneOrg(state.org) as Record<string, unknown>;
					return pickSelected(snapshot, select);
				},
			),
			update: vi.fn(
				async ({
					where,
					data,
					select,
				}: {
					where: { id: string };
					data: Record<string, unknown>;
					select?: Record<string, boolean>;
				}) => {
					if (where.id !== state.org.id) throw new Error('Not found');
					const updated = applyUpdate(state.org, data);
					const snapshot = cloneOrg(updated) as Record<string, unknown>;
					return pickSelected(snapshot, select);
				},
			),
			updateMany: vi.fn(),
		},
		grant: {
			findMany: vi.fn(
				async ({
					where,
					take,
				}: {
					where: { id?: { gt?: string } };
					take?: number;
				}) => {
					const allowedStatuses: $Enums.GrantStatus[] = [
						$Enums.GrantStatus.OPEN,
						$Enums.GrantStatus.UNKNOWN,
					];
					const filtered = state.grants
						.filter((g) => {
							if (!allowedStatuses.includes(g.status)) return false;
							if (g.closedAt !== null) return false;
							if (where.id?.gt) {
								return g.id > where.id.gt;
							}
							return true;
						})
						.sort((a, b) => a.id.localeCompare(b.id))
						.slice(0, take ?? BATCH_SIZE_DEFAULT)
						.map((g) => ({ id: g.id }));
					return filtered;
				},
			),
		},
		grantMatch: {
			findMany: vi.fn(
				async ({
					where,
				}: {
					where: { organizationId: string; grantId?: { in?: string[] } };
				}) => {
					if (where.organizationId !== state.org.id) return [];
					const ids = where.grantId?.in;
					const matches = state.grantMatches ?? [];
					if (!ids) return matches;
					return matches.filter((m) => ids.includes(m.grantId));
				},
			),
			upsert: vi.fn().mockResolvedValue(null),
		},
	} satisfies Record<string, unknown>;

	return {
		prisma: prisma as unknown as OrgTickPrisma,
		setOrganizationId: (id: string | null) => {
			currentOrganizationId = id;
		},
		state,
	};
}

describe('tickOrgMatchIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('claim is atomic and second claim is rejected', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-1',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: null,
				matchIndexClaimedAt: null,
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 1,
			},
			grants: [],
		});
		mock.setOrganizationId('org-1');

		const first = await claimOrgMatchIndexTick(mock.prisma, 'org-1');
		const second = await claimOrgMatchIndexTick(mock.prisma, 'org-1');

		expect(first.claimed).toBe(true);
		expect(second.claimed).toBe(false);
		if (!second.claimed) {
			expect(second.reason).toBe('ALREADY_CLAIMED');
		}
	});

	it('cursor advances over batches', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-2',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: null,
				matchIndexClaimedAt: null,
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 1,
			},
			grants: [
				{ id: 'A', status: $Enums.GrantStatus.OPEN, closedAt: null },
				{ id: 'B', status: $Enums.GrantStatus.OPEN, closedAt: null },
				{ id: 'C', status: $Enums.GrantStatus.OPEN, closedAt: null },
			],
		});
		mock.setOrganizationId('org-2');

		const first = await runOrgMatchIndexTick(mock.prisma, 'org-2', {
			batchSize: 2,
		});
		mock.setOrganizationId('org-2');
		const second = await runOrgMatchIndexTick(mock.prisma, 'org-2', {
			batchSize: 2,
		});

		expect(first.claimed).toBe(true);
		if (first.claimed && first.commit?.committed) {
			expect(first.commit.organization.cursor).toBe('B');
		}
		expect(second.claimed).toBe(true);
		if (second.claimed && second.commit?.committed) {
			expect(
				second.commit.organization.cursor === 'C' ||
					second.commit.organization.cursor === null,
			).toBe(true);
		}
	});

	it('filters out closed grants', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-3',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: null,
				matchIndexClaimedAt: null,
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 2,
			},
			grants: [
				{ id: 'open', status: $Enums.GrantStatus.OPEN, closedAt: null },
				{
					id: 'closed',
					status: $Enums.GrantStatus.CLOSED,
					closedAt: new Date(),
				},
			],
		});
		mock.setOrganizationId('org-3');

		const work = await performOrgMatchIndexWork(mock.prisma, 'org-3', null, 10);

		const { ensureGrantMatches } = await import('./upsertGrantMatch');

		expect(ensureGrantMatches).toHaveBeenCalledWith(
			expect.objectContaining({
				grantIds: ['open'],
				scoringVersion: 2,
			}),
		);
		expect(work.indexedDelta).toBe(1);
	});

	it('only recomputes grant matches when version mismatches', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-6',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: null,
				matchIndexClaimedAt: null,
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 2,
			},
			grants: [
				{ id: 'A', status: $Enums.GrantStatus.OPEN, closedAt: null },
				{ id: 'B', status: $Enums.GrantStatus.OPEN, closedAt: null },
			],
			grantMatches: [
				{ grantId: 'A', version: 2 },
				{ grantId: 'B', version: 1 },
			],
		});
		mock.setOrganizationId('org-6');

		const work = await performOrgMatchIndexWork(mock.prisma, 'org-6', null, 10);

		const { ensureGrantMatches } = await import('./upsertGrantMatch');
		expect(ensureGrantMatches).toHaveBeenCalledWith(
			expect.objectContaining({
				grantIds: ['B'],
				scoringVersion: 2,
			}),
		);
		expect(work.recomputedDelta).toBeGreaterThanOrEqual(1);
	});

	it('commit is guarded by claim id', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-4',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: 'claim-expected',
				matchIndexClaimedAt: new Date(),
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 1,
			},
			grants: [],
		});

		const result = await commitOrgMatchIndexTick(mock.prisma, {
			organizationId: 'org-4',
			claimId: 'wrong-claim',
			indexedDelta: 0,
			nextCursor: null,
			done: true,
		});

		expect(result.committed).toBe(false);
		if (!result.committed) {
			expect(result.reason).toBe('STALE_CLAIM');
		}
	});

	it('marks COMPLETE when done', async () => {
		const mock = createPrismaMock({
			org: {
				id: 'org-5',
				matchIndexStatus: $Enums.MatchIndexStatus.RUNNING,
				matchIndexedCount: 0,
				matchIndexCursor: null,
				matchIndexClaimId: 'claim-5',
				matchIndexClaimedAt: new Date(),
				matchIndexError: null,
				matchIndexErrorJson: null,
				matchIndexedAt: null,
				scoringVersion: 1,
			},
			grants: [],
		});

		const result = await commitOrgMatchIndexTick(mock.prisma, {
			organizationId: 'org-5',
			claimId: 'claim-5',
			indexedDelta: 0,
			nextCursor: null,
			done: true,
		});

		expect(result.committed).toBe(true);
		if (result.committed) {
			expect(result.organization.status).toBe($Enums.MatchIndexStatus.COMPLETE);
			expect(result.organization.indexedAt).not.toBeNull();
		}
	});
});
