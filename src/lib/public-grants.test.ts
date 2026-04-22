import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	process.env.DATABASE_URL =
		process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb';

	const grantFindMany = vi.fn();
	const grantCount = vi.fn();
	const grantGroupBy = vi.fn();
	const grantFindUnique = vi.fn();

	return { grantFindMany, grantCount, grantGroupBy, grantFindUnique };
});

vi.mock('@/lib/db', () => ({
	db: {
		grant: {
			findMany: mocks.grantFindMany,
			count: mocks.grantCount,
			groupBy: mocks.grantGroupBy,
			findUnique: mocks.grantFindUnique,
		},
	},
}));

import {
	getGrantById,
	getGrantSources,
	getIndexableGrantIds,
	getPublicGrants,
} from './public-grants';

afterEach(() => {
	vi.clearAllMocks();
});

describe('getPublicGrants', () => {
	it('returns grants, total, page, limit, totalPages', async () => {
		const fakeGrants = [{ id: 'g1', title: 'Grant 1' }];
		mocks.grantFindMany.mockResolvedValue(fakeGrants);
		mocks.grantCount.mockResolvedValue(1);

		const result = await getPublicGrants({});

		expect(result.grants).toEqual(fakeGrants);
		expect(result.total).toBe(1);
		expect(result.page).toBe(1);
		expect(result.totalPages).toBe(1);
	});

	it('filters by source when provided', async () => {
		mocks.grantFindMany.mockResolvedValue([]);
		mocks.grantCount.mockResolvedValue(0);

		await getPublicGrants({ source: 'FEDERAL' });

		const whereArg = mocks.grantFindMany.mock.calls.at(-1)?.[0]?.where;
		expect(whereArg?.source).toBe('FEDERAL');
	});

	it('does not add source filter when omitted', async () => {
		mocks.grantFindMany.mockResolvedValue([]);
		mocks.grantCount.mockResolvedValue(0);

		await getPublicGrants({});

		const whereArg = mocks.grantFindMany.mock.calls.at(-1)?.[0]?.where;
		expect(whereArg?.source).toBeUndefined();
	});

	it('calculates skip correctly for page 2', async () => {
		mocks.grantFindMany.mockResolvedValue([]);
		mocks.grantCount.mockResolvedValue(50);

		await getPublicGrants({ page: 2, limit: 10 });

		const args = mocks.grantFindMany.mock.calls.at(-1)?.[0];
		expect(args?.skip).toBe(10);
		expect(args?.take).toBe(10);
	});

	it('computes totalPages correctly', async () => {
		mocks.grantFindMany.mockResolvedValue([]);
		mocks.grantCount.mockResolvedValue(25);

		const result = await getPublicGrants({ limit: 10 });

		expect(result.totalPages).toBe(3);
	});

	it('excludes CLOSED grants via where clause', async () => {
		mocks.grantFindMany.mockResolvedValue([]);
		mocks.grantCount.mockResolvedValue(0);

		await getPublicGrants({});

		const whereArg = mocks.grantFindMany.mock.calls.at(-1)?.[0]?.where;
		expect(whereArg?.deadlineType?.not).toBe('CLOSED');
		expect(whereArg?.status?.not).toBe('CLOSED');
	});
});

describe('getGrantById', () => {
	it('returns grant with details when found', async () => {
		const fakeGrant = { id: 'g1', details: { description: 'desc' } };
		mocks.grantFindUnique.mockResolvedValue(fakeGrant);

		const result = await getGrantById('g1');

		expect(result).toEqual(fakeGrant);
		expect(mocks.grantFindUnique.mock.calls.at(-1)?.[0]?.where?.id).toBe('g1');
	});

	it('returns null when grant not found', async () => {
		mocks.grantFindUnique.mockResolvedValue(null);

		const result = await getGrantById('nonexistent');

		expect(result).toBeNull();
	});
});

describe('getIndexableGrantIds', () => {
	it('returns id and updatedAt fields', async () => {
		const fakeIds = [
			{ id: 'g1', updatedAt: new Date() },
			{ id: 'g2', updatedAt: new Date() },
		];
		mocks.grantFindMany.mockResolvedValue(fakeIds);

		const result = await getIndexableGrantIds();

		expect(result).toEqual(fakeIds);
	});

	it('excludes CLOSED grants', async () => {
		mocks.grantFindMany.mockResolvedValue([]);

		await getIndexableGrantIds();

		const whereArg = mocks.grantFindMany.mock.calls.at(-1)?.[0]?.where;
		expect(whereArg?.deadlineType?.not).toBe('CLOSED');
	});
});

describe('getGrantSources', () => {
	it('maps groupBy results to source strings', async () => {
		mocks.grantGroupBy.mockResolvedValue([
			{ source: 'FEDERAL' },
			{ source: 'CALIFORNIA' },
		]);

		const result = await getGrantSources();

		expect(result).toEqual(['FEDERAL', 'CALIFORNIA']);
	});

	it('returns empty array when no sources', async () => {
		mocks.grantGroupBy.mockResolvedValue([]);

		const result = await getGrantSources();

		expect(result).toEqual([]);
	});
});
