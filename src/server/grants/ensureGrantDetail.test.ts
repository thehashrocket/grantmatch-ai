// src/server/grants/ensureGrantDetail.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $Enums } from '@/prisma/generated/client';
import type { PrismaClient } from '@/prisma/generated/client';
import {
	ensureGrantDetail,
	FETCH_STALE_MS,
	FAILED_RETRY_TTL_MS,
} from './ensureGrantDetail';
import type { GrantWithRelations } from './details/types';

const fetchMock = vi.fn(async () => ({
	detail: { fetchedAt: new Date() },
	attachments: [],
	grantPatch: {},
}));

const parseCalls = (spy: ReturnType<typeof vi.spyOn>) =>
	spy.mock.calls.map(([line]) => JSON.parse(String(line)));

vi.mock('@/server/grants/details/fetchers', () => ({
	getDetailFetcher: vi.fn(() => ({
		endpoint: 'test-endpoint',
		fetch: fetchMock,
	})),
}));

const baseGrant = (): GrantWithRelations => {
	const now = new Date();
	return {
		id: 'grant-1',
		url: 'https://example.com',
		title: 'Test Grant',
		number: null,
		deadline: null,
		deadlineType: null,
		openDate: null,
		openDateType: null,
		stateAgency: null,
		matchFunding: null,
		estimatedTotalFunding: null,
		awardFloor: null,
		awardCeiling: null,
		estimatedAwardAmounts: null,
		fundsDisbursment: null,
		currentAsOf: now,
		grantor: 'Grantor',
		portalId: null,
		opportunityType: null,
		purpose: null,
		eligibleApplicants: null,
		eligibleGeographies: null,
		details: null,
		detailsStatus: $Enums.GrantDetailsStatus.UNKNOWN,
		detailsFetchedAt: null,
		detailsError: null,
		detailsErrorAt: null,
		attachments: [],
		source: $Enums.GrantSource.FEDERAL,
		agencyCode: null,
		cfdaList: null,
		sourceRecordId: 'source-1',
		sourceKey: null,
		contentHash: null,
		lastSeenAt: now,
		status: $Enums.GrantStatus.UNKNOWN,
		closedAt: null,
		fitScore: null,
		fitScoreVersion: 1,
		fitScoreComputedAt: null,
		createdAt: now,
		updatedAt: now,
	} satisfies GrantWithRelations;
};

function createPrismaMock(grant: GrantWithRelations): PrismaClient {
	let currentGrant = { ...grant };

	const prisma = {
		grant: {
			findUnique: vi.fn(async () => currentGrant),
			updateMany: vi.fn(async () => {
				throw new Error('updateMany should not be called');
			}),
			update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
				currentGrant = { ...currentGrant, ...data };
				return currentGrant;
			}),
		},
		grantDetail: {
			upsert: vi.fn(async ({ create }) => {
				currentGrant.details = { ...(currentGrant.details ?? {}), ...create };
				return currentGrant.details;
			}),
		},
		grantAttachment: {
			deleteMany: vi.fn(async () => ({})),
			createMany: vi.fn(async () => ({})),
		},
		grantSyncRun: {
			create: vi.fn(async () => ({ id: 'run-1' })),
			update: vi.fn(async () => ({})),
		},
		grantChange: {
			create: vi.fn(async () => ({})),
		},
		$transaction: async (cb: (tx: unknown) => Promise<unknown>) => cb(prisma),
		$queryRaw: vi.fn(async () => {
			const now = new Date(vi.getMockedSystemTime() ?? Date.now());
			const staleBoundary = new Date(now.getTime() - FETCH_STALE_MS);
			const failedRetryBoundary = new Date(now.getTime() - FAILED_RETRY_TTL_MS);

			const eligible =
				currentGrant.id === grant.id &&
				(currentGrant.detailsStatus === $Enums.GrantDetailsStatus.UNKNOWN ||
					currentGrant.detailsStatus === null ||
					(currentGrant.detailsStatus === $Enums.GrantDetailsStatus.FAILED &&
						currentGrant.detailsErrorAt !== null &&
						currentGrant.detailsErrorAt < failedRetryBoundary) ||
					(currentGrant.detailsStatus === $Enums.GrantDetailsStatus.FETCHING &&
						(currentGrant.detailsFetchedAt === null ||
							currentGrant.detailsFetchedAt < staleBoundary)));

			if (!eligible) {
				return [];
			}

			currentGrant = {
				...currentGrant,
				detailsStatus: $Enums.GrantDetailsStatus.FETCHING,
				detailsFetchedAt: now,
				detailsError: null,
				detailsErrorAt: null,
			};

			return [{ id: currentGrant.id }];
		}),
	};

	return prisma as unknown as PrismaClient;
}

describe('ensureGrantDetail concurrency guards', () => {
	const now = new Date('2025-01-01T00:00:00Z');
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
		fetchMock.mockClear();
		infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
		warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		vi.useRealTimers();
		infoSpy.mockRestore();
		warnSpy.mockRestore();
		errorSpy.mockRestore();
	});

	it('skips fetch when status is AVAILABLE', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.AVAILABLE;
		grant.detailsFetchedAt = now;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(prisma.grant.updateMany).not.toHaveBeenCalled();
	});

	it('skips fetch when status is FETCHING and recent', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FETCHING;
		grant.detailsFetchedAt = now;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('fetches details for supported non-federal sources (California)', async () => {
		const grant = baseGrant();
		grant.source = $Enums.GrantSource.CALIFORNIA;
		grant.details = null;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('skips unsupported sources without details', async () => {
		const grant = baseGrant();
		grant.source = $Enums.GrantSource.OTHER;
		grant.details = null;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('fetches when status is FETCHING but stale', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FETCHING;
		grant.detailsFetchedAt = new Date(now.getTime() - FETCH_STALE_MS - 1000);
		grant.detailsErrorAt = grant.detailsFetchedAt;
		grant.details = null;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('skips fetch when status is FAILED and within retry TTL', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FAILED;
		grant.detailsErrorAt = now;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('retries fetch when status is FAILED and past retry TTL', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FAILED;
		grant.detailsErrorAt = new Date(now.getTime() - FAILED_RETRY_TTL_MS - 1000);
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not claim when FETCHING is recent', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FETCHING;
		grant.detailsFetchedAt = now;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('reclaims when FETCHING is stale', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FETCHING;
		grant.detailsFetchedAt = new Date(now.getTime() - FETCH_STALE_MS - 1000);
		grant.detailsErrorAt = grant.detailsFetchedAt;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('does not claim when FAILED within retry TTL', async () => {
		const grant = baseGrant();
		grant.detailsStatus = $Enums.GrantDetailsStatus.FAILED;
		grant.detailsErrorAt = now;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('claims when detailsStatus is null (treated as UNKNOWN)', async () => {
		const grant = baseGrant();
		// @ts-expect-error allow null to simulate legacy/null status
		grant.detailsStatus = null;
		const prisma = createPrismaMock(grant);

		const result = await ensureGrantDetail(prisma, grant.id);

		expect(result.fetched).toBe(true);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('claims atomically so concurrent calls only fetch once', async () => {
		const grant = baseGrant();
		const prisma = createPrismaMock(grant);

		const queryRawSpy = prisma.$queryRaw as ReturnType<typeof vi.fn>;
		queryRawSpy.mockImplementationOnce(async () => [
			{ id: grant.id, prevStatus: grant.detailsStatus },
		]);
		queryRawSpy.mockImplementationOnce(async () => []);

		const [resultA, resultB] = await Promise.all([
			ensureGrantDetail(prisma, grant.id),
			ensureGrantDetail(prisma, grant.id),
		]);

		const fetchedCount = [resultA, resultB].filter((r) => r.fetched).length;
		expect(fetchedCount).toBe(1);
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(queryRawSpy).toHaveBeenCalledTimes(2);

		const infoLogs = parseCalls(infoSpy);
		const warnLogs = parseCalls(warnSpy);
		expect(infoLogs.filter((l) => l.decision === 'claim_success')).toHaveLength(
			1,
		);
		expect(warnLogs.filter((l) => l.decision === 'claim_miss')).toHaveLength(1);
	});

	it('logs prevStatus from claim on failure', async () => {
		const grant = baseGrant();
		const prisma = createPrismaMock(grant);
		const queryRawSpy = prisma.$queryRaw as ReturnType<typeof vi.fn>;
		queryRawSpy.mockImplementation(async () => [
			{ id: grant.id, prevStatus: 'FETCHING' },
		]);
		fetchMock.mockRejectedValueOnce(new Error('network fail'));

		await ensureGrantDetail(prisma, grant.id);

		const errorLogs = parseCalls(errorSpy);
		const failedLog = errorLogs.find((l) => l.decision === 'fetch_failed');
		expect(failedLog?.prevStatus).toBe('FETCHING');
		expect(String(failedLog?.error)).toContain('network fail');
	});
});
