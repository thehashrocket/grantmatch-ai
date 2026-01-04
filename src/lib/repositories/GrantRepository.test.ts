import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
	const grantFindMany = vi.fn();
	const grantCount = vi.fn();
	const grantMatchFindMany = vi.fn();
	const grantMatchCount = vi.fn();

	process.env.DATABASE_URL =
		process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb';

	return { grantFindMany, grantCount, grantMatchFindMany, grantMatchCount };
});

vi.mock('@/lib/db', () => ({
	db: {
		grant: {
			findMany: mocks.grantFindMany,
			count: mocks.grantCount,
		},
		grantMatch: {
			findMany: mocks.grantMatchFindMany,
			count: mocks.grantMatchCount,
		},
	},
}));

vi.mock('@/server/grants/match/upsertGrantMatch', () => ({
	ensureGrantMatches: vi
		.fn()
		.mockResolvedValue({ createdCount: 0, updatedCount: 0 }),
}));

import { PrismaGrantRepository } from './GrantRepository';

const filters = {
	textSearch: '',
	minFunding: '',
	maxFunding: '',
	minDeadline: '',
	maxDeadline: '',
	deadlineWithinDays: '',
	minFitScore: '8',
	maxFitScore: '',
	source: 'ALL',
	sort: 'FIT_DESC' as const,
};

describe('PrismaGrantRepository org-aware pagination', () => {
	it('counts grant matches with fit score filters for totals', async () => {
		mocks.grantFindMany.mockResolvedValue([{ id: 'g1' }]);
		mocks.grantMatchFindMany.mockResolvedValue([
			{
				fitScore: 9.1,
				subscoresJson: null,
				explanation: null,
				grant: {},
			},
		]);
		mocks.grantMatchCount.mockResolvedValue(1);

		const repo = new PrismaGrantRepository();
		const result = await repo.findWithFiltersPaginatedForOrg(
			filters,
			1,
			10,
			'org-1',
		);

		expect(result.total).toBe(1);
		expect(mocks.grantMatchCount).toHaveBeenCalledTimes(1);
		const whereArg = mocks.grantMatchCount.mock.calls[0][0].where;
		expect(whereArg.organizationId).toBe('org-1');
		expect(whereArg.fitScore).toEqual({ gte: 8 });
		expect(whereArg.grant).toBeDefined();
	});
});
