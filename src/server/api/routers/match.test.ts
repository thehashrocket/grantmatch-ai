import { beforeEach, describe, expect, it, vi } from 'vitest';
import { matchRouter } from './match';
import type { PrismaClient } from '@/prisma/generated/client';

vi.hoisted(() => {
	process.env.DATABASE_URL =
		process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb';
	process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
	process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client';
	process.env.GOOGLE_CLIENT_SECRET =
		process.env.GOOGLE_CLIENT_SECRET ?? 'test-secret';
});

vi.mock('@/server/grants/match/upsertGrantMatch', () => {
	const ensureGrantMatches = vi.fn(async () => ({
		createdCount: 1,
		updatedCount: 0,
	}));
	return { ensureGrantMatches };
});

const createCaller = (overrides?: {
	prisma?: {
		grantMatch?: { findMany?: (...args: unknown[]) => Promise<unknown> };
	};
	organizationId?: string | null;
}) =>
	matchRouter.createCaller({
		prisma: {
			grantMatch: {
				findMany:
					overrides?.prisma?.grantMatch?.findMany ??
					(vi.fn().mockResolvedValue([]) as unknown),
			},
		} as unknown as PrismaClient,
		session: {
			userId: 'user-1',
			role: 'USER',
			organizationId: overrides?.organizationId ?? 'org-1',
		},
		headers: new Headers(),
	});

describe('matchRouter', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('ensureForGrants dedupes grantIds and calls ensureGrantMatches', async () => {
		const caller = createCaller();
		const result = await caller.ensureForGrants({ grantIds: ['a', 'a', 'b'] });

		const { ensureGrantMatches } = await import(
			'@/server/grants/match/upsertGrantMatch'
		);
		const ensureMock = ensureGrantMatches as unknown as ReturnType<
			typeof vi.fn
		>;

		expect(ensureMock).toHaveBeenCalledTimes(1);
		const args = ensureMock.mock.calls[0][0];
		expect(args.organizationId).toBe('org-1');
		expect(args.grantIds.sort()).toEqual(['a', 'b']);
		expect(result).toEqual({ createdCount: 1, updatedCount: 0 });
	});

	it('scoreMap returns a keyed map of fit scores', async () => {
		const findMany = vi.fn().mockResolvedValue([
			{
				grantId: 'g1',
				fitScore: 9.1,
				subscoresJson: { eligibility: 1 },
				explanation: 'match',
			},
		]);
		const caller = createCaller({
			prisma: { grantMatch: { findMany } },
		});

		const result = await caller.scoreMap({ grantIds: ['g1', 'g2'] });
		expect(findMany).toHaveBeenCalled();
		expect(result).toEqual({
			g1: {
				fitScore: 9.1,
				subscores: { eligibility: 1 },
				explanation: 'match',
			},
		});
	});
});
