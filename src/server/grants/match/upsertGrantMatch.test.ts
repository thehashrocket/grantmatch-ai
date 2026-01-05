import { describe, expect, it, vi, beforeEach } from 'vitest';
import { $Enums } from '@/prisma/generated/client';
import * as matchModule from './upsertGrantMatch';
import * as scoring from '@/lib/utils/org-grant-scoring';

type MockPrisma = {
	organization: {
		findUnique: ReturnType<typeof vi.fn>;
	};
	grantMatch: {
		findMany: ReturnType<typeof vi.fn>;
		findUnique: ReturnType<typeof vi.fn>;
		updateMany: ReturnType<typeof vi.fn>;
		upsert: ReturnType<typeof vi.fn>;
	};
	grant: {
		findMany: ReturnType<typeof vi.fn>;
	};
};

const baseOrganization = {
	id: 'org-1',
	focusAreas: [],
	priorityFocusKeywords: [],
	serviceAreas: [],
	entityType: null,
	budgetRange: null,
	minAward: null,
	maxAward: null,
	scoringVersion: 2,
} satisfies Record<string, unknown>;

const buildPrisma = (overrides?: {
	organization?: Partial<MockPrisma['organization']>;
	grantMatch?: Partial<MockPrisma['grantMatch']>;
	grant?: Partial<MockPrisma['grant']>;
}): MockPrisma => {
	const grantsData: Array<{
		id: string;
		status?: $Enums.GrantStatus;
		closedAt?: Date | null;
	}> = [
		{ id: 'g1', status: $Enums.GrantStatus.OPEN, closedAt: null },
		{ id: 'g2', status: $Enums.GrantStatus.OPEN, closedAt: null },
		{ id: 'g3', status: $Enums.GrantStatus.CLOSED, closedAt: new Date() },
		{ id: 'g4', status: $Enums.GrantStatus.OPEN, closedAt: null },
		{ id: 'g5', status: $Enums.GrantStatus.OPEN, closedAt: null },
	];

	const base: MockPrisma = {
		organization: {
			findUnique: vi.fn().mockResolvedValue(baseOrganization),
		},
		grantMatch: {
			findMany: vi.fn().mockResolvedValue([]),
			findUnique: vi.fn().mockResolvedValue(null),
			updateMany: vi.fn().mockResolvedValue({ count: 0 }),
			upsert: vi.fn().mockResolvedValue(null),
		},
		grant: {
			findMany: vi.fn(
				async ({
					where,
				}: {
					where: {
						id: { in: string[] };
						status?: { in: $Enums.GrantStatus[] };
						closedAt?: null;
					};
					select: Record<string, boolean | object>;
				}) => {
					const ids = where.id.in;
					const allowedStatuses = where.status?.in;
					const results = grantsData.filter((g) => {
						const idMatch = ids.includes(g.id);
						const statusMatch = allowedStatuses
							? allowedStatuses.includes(g.status ?? $Enums.GrantStatus.UNKNOWN)
							: true;
						const closedMatch =
							where.closedAt === null ? g.closedAt === null : true;
						return idMatch && statusMatch && closedMatch;
					});

					return results.map((g) => ({
						id: g.id,
						eligibleApplicants: null,
						eligibleGeographies: null,
						purpose: 'purpose',
						estimatedTotalFunding: null,
						awardFloor: null,
						awardCeiling: null,
					}));
				},
			),
		},
	};

	if (overrides?.organization) {
		base.organization = {
			...base.organization,
			...overrides.organization,
		};
	}
	if (overrides?.grantMatch) {
		base.grantMatch = {
			...base.grantMatch,
			...overrides.grantMatch,
			findMany: overrides.grantMatch.findMany ?? base.grantMatch.findMany,
			findUnique: overrides.grantMatch.findUnique ?? base.grantMatch.findUnique,
			updateMany: overrides.grantMatch.updateMany ?? base.grantMatch.updateMany,
			upsert: overrides.grantMatch.upsert ?? base.grantMatch.upsert,
		};
	}
	if (overrides?.grant) {
		base.grant = {
			...base.grant,
			...overrides.grant,
		};
	}

	return base;
};

describe('ensureGrantMatches concurrency', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('only upserts grants with mismatched versions', async () => {
		const prisma = buildPrisma({
			grantMatch: {
				findMany: vi.fn().mockResolvedValue([
					{ grantId: 'g1', version: 1 },
					{ grantId: 'g2', version: 2 },
				]),
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				upsert: vi.fn().mockResolvedValue(null),
			},
		});

		const result = await matchModule.ensureGrantMatches({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grantIds: ['g1', 'g2'],
			concurrency: 2,
		});

		expect(prisma.organization.findUnique).not.toHaveBeenCalled();
		expect(prisma.grantMatch.upsert).toHaveBeenCalledTimes(1);
		const upsertArgs = (prisma.grantMatch.upsert as ReturnType<typeof vi.fn>)
			.mock.calls[0]?.[0] as { create?: { grantId?: string } } | undefined;
		expect(upsertArgs?.create?.grantId).toBe('g1');
		expect(result.createdCount + result.updatedCount).toBe(1);
	});

	it('skips closed grants even when versions mismatch', async () => {
		const prisma = buildPrisma({
			grantMatch: {
				findMany: vi.fn().mockResolvedValue([
					{ grantId: 'g1', version: 1 },
					{ grantId: 'g3', version: 1 },
				]),
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				upsert: vi.fn().mockResolvedValue(null),
			},
		});

		const result = await matchModule.ensureGrantMatches({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grantIds: ['g1', 'g3'],
			concurrency: 2,
		});

		expect(prisma.grantMatch.upsert).toHaveBeenCalledTimes(1);
		const upsertArgs = (prisma.grantMatch.upsert as ReturnType<typeof vi.fn>)
			.mock.calls[0]?.[0] as { create?: { grantId?: string } } | undefined;
		expect(upsertArgs?.create?.grantId).toBe('g1');
		expect(result.createdCount + result.updatedCount).toBe(1);
	});

	it('bounds concurrent upsertGrantMatch calls', async () => {
		const prisma = buildPrisma();
		const grantIds = ['g1', 'g2', 'g3', 'g4', 'g5'];

		const gates: Array<() => void> = [];
		let inFlight = 0;
		let maxInFlight = 0;
		const expectedCount = grantIds.filter((id) => id !== 'g3').length;

		prisma.grantMatch.upsert = vi.fn(
			() =>
				new Promise((resolve) => {
					inFlight++;
					maxInFlight = Math.max(maxInFlight, inFlight);
					gates.push(() => {
						inFlight--;
						resolve(null);
					});
				}),
		);

		const promise = matchModule.ensureGrantMatches({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grantIds,
			concurrency: 2,
		});

		const interval = setInterval(() => {
			const release = gates.shift();
			if (release) release();
		}, 0);

		const result = await promise;
		clearInterval(interval);
		// Drain any remaining gates just in case
		while (gates.length) {
			const release = gates.shift();
			if (release) release();
		}

		expect(prisma.grantMatch.upsert).toHaveBeenCalledTimes(expectedCount);
		expect(maxInFlight).toBeLessThanOrEqual(2);
		expect(result.createdCount + result.updatedCount).toBe(expectedCount);
	});
});

describe('upsertGrantMatch cheap bump', () => {
	it('only bumps version/timestamp on cheap bump', async () => {
		const prisma = buildPrisma({
			grantMatch: {
				findUnique: vi.fn().mockResolvedValue({ fitScore: 5 }),
				updateMany: vi.fn().mockResolvedValue({ count: 1 }),
				upsert: vi.fn().mockResolvedValue(null),
			},
		});
		vi.spyOn(scoring, 'computeOrgGrantFitScore').mockReturnValue({
			fitScore: 5,
			subscores: { eligibility: 1, geography: 1, purpose: 1, funding: 1 },
			explanation: 'NEW EXPLANATION',
			reasons: [{ label: 'reason', strength: 'strong' }],
			confidence: 'HIGH',
			missing: [],
			matches: {
				priorityMatches: [],
				focusMatches: [],
				geographyOverlap: [],
				amountInRange: null,
			},
		});

		await matchModule.upsertGrantMatch({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grant: {
				id: 'g1',
				eligibleApplicants: null,
				eligibleGeographies: null,
				purpose: 'purpose',
				estimatedTotalFunding: null,
				awardFloor: null,
				awardCeiling: null,
			},
			version: 3,
		});

		expect(prisma.grantMatch.updateMany).toHaveBeenCalledTimes(1);
		const data =
			(prisma.grantMatch.updateMany as ReturnType<typeof vi.fn>).mock
				.calls[0]?.[0]?.data ?? {};
		expect(data.version).toBe(3);
		expect(data.computedAt).toBeInstanceOf(Date);
		expect(data.explanation).toBeUndefined();
		expect(data.subscoresJson).toBeUndefined();
		expect(prisma.grantMatch.upsert).not.toHaveBeenCalled();
	});

	it('falls back to upsert when score differs', async () => {
		const prisma = buildPrisma({
			grantMatch: {
				findUnique: vi.fn().mockResolvedValue({ fitScore: 4.5 }),
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				upsert: vi.fn().mockResolvedValue(null),
			},
		});
		vi.spyOn(scoring, 'computeOrgGrantFitScore').mockReturnValue({
			fitScore: 5.1,
			subscores: { eligibility: 1, geography: 1, purpose: 1, funding: 1 },
			explanation: 'new',
			reasons: [],
			confidence: 'HIGH',
			missing: [],
			matches: {
				priorityMatches: [],
				focusMatches: [],
				geographyOverlap: [],
				amountInRange: null,
			},
		});

		await matchModule.upsertGrantMatch({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grant: {
				id: 'g1',
				eligibleApplicants: null,
				eligibleGeographies: null,
				purpose: 'different purpose',
				estimatedTotalFunding: null,
				awardFloor: null,
				awardCeiling: null,
			},
			version: 3,
		});

		expect(prisma.grantMatch.updateMany).not.toHaveBeenCalled();
		expect(prisma.grantMatch.upsert).toHaveBeenCalledTimes(1);
		const upsertArgs =
			(prisma.grantMatch.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
				?.update ?? {};
		expect(upsertArgs).toHaveProperty('subscoresJson');
		expect(upsertArgs).toHaveProperty('explanation');
	});

	it('falls back to upsert create when row does not exist', async () => {
		const prisma = buildPrisma({
			grantMatch: {
				findUnique: vi.fn().mockResolvedValue(null),
				updateMany: vi.fn().mockResolvedValue({ count: 0 }),
				upsert: vi.fn().mockResolvedValue(null),
			},
		});
		vi.spyOn(scoring, 'computeOrgGrantFitScore').mockReturnValue({
			fitScore: 6,
			subscores: { eligibility: 1, geography: 1, purpose: 1, funding: 1 },
			explanation: 'exp',
			reasons: [],
			confidence: 'HIGH',
			missing: [],
			matches: {
				priorityMatches: [],
				focusMatches: [],
				geographyOverlap: [],
				amountInRange: null,
			},
		});

		await matchModule.upsertGrantMatch({
			prisma: prisma as unknown as matchModule.PrismaLike,
			organization: baseOrganization as matchModule.OrganizationForMatch,
			grant: {
				id: 'g9',
				eligibleApplicants: null,
				eligibleGeographies: null,
				purpose: 'purpose',
				estimatedTotalFunding: null,
				awardFloor: null,
				awardCeiling: null,
			},
			version: 4,
		});

		expect(prisma.grantMatch.updateMany).not.toHaveBeenCalled();
		expect(prisma.grantMatch.upsert).toHaveBeenCalledTimes(1);
		const createArgs =
			(prisma.grantMatch.upsert as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]
				?.create ?? {};
		expect(createArgs.organizationId).toBe('org-1');
		expect(createArgs.grantId).toBe('g9');
		expect(createArgs.version).toBe(4);
	});
});
