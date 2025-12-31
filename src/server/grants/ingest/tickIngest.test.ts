import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PrismaClient, Prisma } from '@/prisma/generated/client';
import { $Enums } from '@/prisma/generated/client';
import {
	claimTick,
	commitTick,
	type CommitArgs,
} from '@/server/grants/ingest/tickIngest';
import { MAX_TICK_ERRORS } from '@/server/grants/ingest/validation';
import { caCkanAdapter } from '@/server/grants/sources/caCkanAdapter';
import { fetchCkanPage } from '@/server/grants/ckanClient';
import { federalGrantsGovAdapter } from '@/server/grants/sources/federalGrantsGovAdapter';
import { postJsonWithRetry } from '@/server/grants/sources/federalClient';

vi.mock('@/server/grants/ckanClient', async () => {
	const actual = await vi.importActual<
		typeof import('@/server/grants/ckanClient')
	>('@/server/grants/ckanClient');
	return {
		...actual,
		fetchCkanPage: vi.fn(),
	};
});

vi.mock('@/server/grants/sources/federalClient', async () => {
	const actual = await vi.importActual<
		typeof import('@/server/grants/sources/federalClient')
	>('@/server/grants/sources/federalClient');
	return {
		...actual,
		postJsonWithRetry: vi.fn(),
	};
});

type MockState = {
	id: string;
	source: $Enums.GrantSource;
	status: $Enums.ImportStatus;
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
	finishedAt: Date | null;
	errorsJson: Prisma.JsonValue | null;
	schemaJson: Record<string, unknown>;
};

function createMockPrisma(initial: Partial<MockState> & { id: string }) {
	const state: MockState = {
		id: initial.id,
		source: initial.source ?? $Enums.GrantSource.CALIFORNIA,
		status: initial.status ?? $Enums.ImportStatus.IN_PROGRESS,
		recordsFetched: initial.recordsFetched ?? 0,
		createdCount: initial.createdCount ?? 0,
		updatedCount: initial.updatedCount ?? 0,
		unchangedCount: initial.unchangedCount ?? 0,
		closedCount: initial.closedCount ?? 0,
		reopenedCount: initial.reopenedCount ?? 0,
		finishedAt: initial.finishedAt ?? null,
		errorsJson: initial.errorsJson ?? null,
		schemaJson: initial.schemaJson ?? {},
	};

	let currentCommitArgs: CommitArgs | null = null;

	const prisma = {
		$queryRaw: vi.fn(async (sql: Prisma.Sql) => {
			const text =
				typeof sql === 'string' ? sql : (sql.strings ?? []).join(' ');
			if (text.includes('"recordsFetched" = "recordsFetched"')) {
				if (!currentCommitArgs) {
					throw new Error('Commit args not set for mock');
				}
				if (currentCommitArgs.runId !== state.id) return [];
				if (state.schemaJson.tickClaimId !== currentCommitArgs.tickClaimId) {
					return [];
				}
				state.recordsFetched += currentCommitArgs.deltas.fetchedDelta;
				state.createdCount += currentCommitArgs.deltas.createdDelta;
				state.updatedCount += currentCommitArgs.deltas.updatedDelta;
				state.unchangedCount += currentCommitArgs.deltas.unchangedDelta;
				state.closedCount += currentCommitArgs.deltas.closedDelta;
				state.reopenedCount += currentCommitArgs.deltas.reopenedDelta;

				const schema = { ...state.schemaJson };
				schema.tickErrors = [
					...(Array.isArray(schema.tickErrors) ? schema.tickErrors : []),
					...(currentCommitArgs.errors ?? []),
				].slice(0, MAX_TICK_ERRORS);
				if (currentCommitArgs.done) {
					delete schema.cursor;
					state.status = $Enums.ImportStatus.COMPLETED;
					state.finishedAt = new Date();
				} else {
					schema.cursor = currentCommitArgs.nextCursor ?? null;
				}
				delete schema.tickClaimId;
				delete schema.tickClaimedAt;
				state.schemaJson = schema;
				const mergedErrors = (currentCommitArgs.errors ?? []) as unknown[];
				const mergedJson = Array.isArray(state.errorsJson)
					? [...(state.errorsJson as unknown[]), ...mergedErrors]
					: mergedErrors;
				state.errorsJson = mergedJson as Prisma.JsonValue;
				return [cloneState(state)];
			}

			const values = Array.isArray(
				typeof sql === 'string' ? null : (sql as Prisma.Sql).values,
			)
				? ((sql as Prisma.Sql).values as unknown[])
				: [];
			const [
				tickClaimId = `mock-claim-${Date.now()}`,
				tickClaimedAt = new Date().toISOString(),
				runId = state.id,
				status = state.status,
				staleSeconds = 30,
			] = values;
			if (runId !== state.id || status !== state.status) return [];
			const claimedAtRaw = state.schemaJson.tickClaimedAt as string | undefined;
			const claimedAt = claimedAtRaw ? new Date(claimedAtRaw) : null;
			const staleBoundary = new Date(Date.now() - Number(staleSeconds) * 1000);
			const claimable =
				!state.schemaJson.tickClaimId ||
				!claimedAt ||
				claimedAt < staleBoundary;
			if (!claimable) return [];
			state.schemaJson = {
				...state.schemaJson,
				tickClaimId: tickClaimId as string,
				tickClaimedAt: tickClaimedAt as string,
			};
			return [cloneState(state)];
		}),
		grantSyncRun: {
			findUnique: vi.fn(async ({ where }: { where: { id: string } }) => {
				return where.id === state.id ? cloneState(state) : null;
			}),
		},
		setCommitArgs: (args: CommitArgs | null) => {
			currentCommitArgs = args;
		},
		state,
	};

	return prisma;
}

const cloneState = (state: MockState): MockState => ({
	...state,
	schemaJson: { ...state.schemaJson },
});

describe('claimTick', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('prevents concurrent claims for the same run', async () => {
		const mock = createMockPrisma({ id: 'run-1' });

		const [first, second] = await Promise.all([
			claimTick(mock as unknown as PrismaClient, 'run-1', 30),
			claimTick(mock as unknown as PrismaClient, 'run-1', 30),
		]);

		const claimed = first.claimed ? first : second;
		const rejected = first.claimed ? second : first;

		if (!claimed.claimed) {
			throw new Error('Expected one claim to succeed');
		}
		if (rejected.claimed) {
			throw new Error('Expected one claim to be rejected');
		}

		expect(claimed.run.schema.tickClaimId).toBeDefined();
		expect(rejected.reason).toBe('TICK_ALREADY_CLAIMED');
	});

	it('allows re-claim after stale timeout', async () => {
		const stale = new Date('2024-12-31T23:59:00Z').toISOString();
		const mock = createMockPrisma({
			id: 'run-2',
			schemaJson: { tickClaimId: 'existing', tickClaimedAt: stale },
		});

		const claim = await claimTick(
			mock as unknown as PrismaClient,
			'run-2',
			30,
		);

		if (!claim.claimed) {
			throw new Error('Expected claim to succeed after stale');
		}

		expect(claim.run.schema.tickClaimId).not.toBe('existing');
	});
});

describe('commitTick', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('rejects stale tickClaimId updates', async () => {
		const mock = createMockPrisma({
			id: 'run-3',
			schemaJson: { tickClaimId: 'fresh-claim', tickClaimedAt: new Date().toISOString() },
		});
		const args: CommitArgs = {
			runId: 'run-3',
			tickClaimId: 'wrong-claim',
			nextCursor: 100,
			done: false,
			errors: [],
			deltas: {
				fetchedDelta: 1,
				createdDelta: 1,
				updatedDelta: 0,
				unchangedDelta: 0,
				closedDelta: 0,
				reopenedDelta: 0,
			},
		};
		mock.setCommitArgs(args);

		const result = await commitTick(
			mock as unknown as PrismaClient,
			args,
		);

		expect(result.committed).toBe(false);
		if (result.committed) throw new Error('Commit should be rejected');
		expect(result.reason).toBe('STALE_CLAIM');
	});
});

describe('adapter paging', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('pages CKAN records with nextCursor until done', async () => {
		const fetchMock = vi.mocked(fetchCkanPage);
		fetchMock.mockResolvedValueOnce({
			total: 3,
			records: [{ a: 1 }, { a: 2 }],
		});
		fetchMock.mockResolvedValueOnce({
			total: 3,
			records: [{ a: 3 }],
		});

		const first = await caCkanAdapter.getPage();
		expect(first.records).toHaveLength(2);
		expect(first.done).toBe(false);
		expect(first.nextCursor).toBeGreaterThan(0);

		const second = await caCkanAdapter.getPage(first.nextCursor);
		expect(second.records).toHaveLength(1);
		expect(second.done).toBe(true);
	});

	it('marks federal page done when last slice is fetched', async () => {
		const postMock = vi.mocked(postJsonWithRetry);
		postMock.mockResolvedValueOnce({
			hitCount: 300,
			startRecord: 0,
			oppHits: [{ id: '1' }],
		});
		postMock.mockResolvedValueOnce({
			hitCount: 300,
			startRecord: 200,
			oppHits: [],
		});

		const first = await federalGrantsGovAdapter.getPage();
		expect(first.records).toHaveLength(1);
		expect(first.done).toBe(false);

		const second = await federalGrantsGovAdapter.getPage(first.nextCursor);
		expect(second.records).toHaveLength(0);
		expect(second.done).toBe(true);
	});
});
