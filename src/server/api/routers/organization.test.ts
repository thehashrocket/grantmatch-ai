import { describe, expect, it, vi } from 'vitest';
import { $Enums, type PrismaClient } from '@/prisma/generated/client';
import { SCORING_VERSION } from '@/lib/utils/org-grant-scoring';
import { organizationRouter } from './organization';

vi.hoisted(() => {
	process.env.DATABASE_URL =
		process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb';
	process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
	process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client';
	process.env.GOOGLE_CLIENT_SECRET =
		process.env.GOOGLE_CLIENT_SECRET ?? 'test-secret';
});

describe('organizationRouter.updateProfile', () => {
	it('does not reset match indexing when scoring fields are unchanged', async () => {
		const organization = {
			id: 'org-1',
			name: 'Test Org',
			description: 'A test organization',
			mission: 'Mission text',
			focusAreas: ['education', 'housing'],
			serviceAreas: ['california', 'nevada'],
			priorityFocusKeywords: [],
			entityType: $Enums.OrganizationEntityType.NONPROFIT_501C3,
			revenueSources: [
				$Enums.RevenueSource.GRANTS,
				$Enums.RevenueSource.DONATIONS,
			],
			budgetRange: $Enums.BudgetRange.FROM_50K_TO_250K,
			staffRange: $Enums.StaffRange.SIX_TO_TWENTY,
			minAward: null,
			maxAward: null,
			scoringVersion: 1,
			matchIndexStatus: $Enums.MatchIndexStatus.COMPLETE,
			matchIndexedAt: new Date('2024-01-01T00:00:00.000Z'),
			matchIndexedCount: 5,
			matchIndexError: null,
			address1: '123 Main St',
			address2: null,
			city: 'Somewhere',
			state: 'CA',
			zipCode: '90210',
			users: [],
			invitations: [],
			grantMatches: [],
			createdAt: new Date('2023-12-31T00:00:00.000Z'),
			updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		};

		const findUnique = vi.fn().mockResolvedValue(organization);
		const update = vi.fn();

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					findUnique,
					update,
				},
			} as unknown as PrismaClient,
			session: {
				userId: 'user-1',
				role: 'USER',
				organizationId: organization.id,
			},
			headers: new Headers(),
		});

		const result = await caller.updateProfile({
			entityType: $Enums.OrganizationEntityType.NONPROFIT_501C3,
			revenueSources: [
				$Enums.RevenueSource.DONATIONS,
				$Enums.RevenueSource.GRANTS,
			],
			budgetRange: $Enums.BudgetRange.FROM_50K_TO_250K,
			staffRange: $Enums.StaffRange.SIX_TO_TWENTY,
			focusAreas: ['housing', 'education'],
			serviceAreas: ['nevada', 'california'],
		});

		expect(update).not.toHaveBeenCalled();
		expect(result.matchIndexStatus).toBe(organization.matchIndexStatus);
		expect(result.matchIndexedAt).toBe(organization.matchIndexedAt);
		expect(result.scoringVersion).toBe(organization.scoringVersion);
	});

	it('resets match indexing when scoring fields change', async () => {
		const organization = {
			entityType: $Enums.OrganizationEntityType.NONPROFIT_501C3,
			revenueSources: [$Enums.RevenueSource.GRANTS],
			budgetRange: $Enums.BudgetRange.LT_50K,
			staffRange: $Enums.StaffRange.ONE_TO_FIVE,
			focusAreas: ['education'],
			serviceAreas: ['california'],
			mission: 'Mission',
			description: 'Desc',
			scoringVersion: 1,
			matchIndexStatus: $Enums.MatchIndexStatus.COMPLETE,
			matchIndexedAt: new Date('2024-01-01T00:00:00.000Z'),
			matchIndexedCount: 5,
			matchIndexError: null,
			priorityFocusKeywords: [],
		};

		const findUnique = vi.fn().mockResolvedValue(organization);
		const update = vi.fn().mockResolvedValue({
			...organization,
			focusAreas: ['youth'],
			scoringVersion: SCORING_VERSION,
			matchIndexStatus: $Enums.MatchIndexStatus.NOT_STARTED,
			matchIndexedAt: null,
			matchIndexedCount: 0,
			matchIndexError: null,
		});

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					findUnique,
					update,
				},
			} as unknown as PrismaClient,
			session: {
				userId: 'user-1',
				role: 'USER',
				organizationId: 'org-1',
			},
			headers: new Headers(),
		});

		const result = await caller.updateProfile({
			focusAreas: ['Youth '],
		});

		expect(update).toHaveBeenCalled();
		expect(result.matchIndexStatus).toBe($Enums.MatchIndexStatus.NOT_STARTED);
		expect(result.scoringVersion).toBe(SCORING_VERSION);
	});

	it('normalizes mission and description text', async () => {
		const organization = {
			entityType: null,
			revenueSources: [],
			budgetRange: null,
			staffRange: null,
			focusAreas: [],
			serviceAreas: [],
			mission: 'Keep',
			description: 'Existing',
			scoringVersion: 1,
			matchIndexStatus: $Enums.MatchIndexStatus.COMPLETE,
			matchIndexedAt: null,
			matchIndexedCount: 0,
			matchIndexError: null,
			priorityFocusKeywords: [],
		};

		const findUnique = vi.fn().mockResolvedValue(organization);
		const update = vi.fn().mockResolvedValue({
			...organization,
			mission: 'TBD',
			description: null,
		});

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					findUnique,
					update,
				},
			} as unknown as PrismaClient,
			session: {
				userId: 'user-1',
				role: 'USER',
				organizationId: 'org-1',
			},
			headers: new Headers(),
		});

		const result = await caller.updateProfile({
			mission: '   ',
			description: '\n',
		});

		expect(update).toHaveBeenCalledWith({
			where: { id: 'org-1' },
			data: {
				mission: 'TBD',
				description: null,
			},
		});
		expect(result.mission).toBe('TBD');
		expect(result.description).toBeNull();
	});

	it('enforces priority keyword limit server-side', async () => {
		const organization = {
			entityType: null,
			revenueSources: [],
			budgetRange: null,
			staffRange: null,
			focusAreas: [],
			serviceAreas: [],
			priorityFocusKeywords: [],
			mission: 'Keep',
			description: 'Existing',
			scoringVersion: 1,
			matchIndexStatus: $Enums.MatchIndexStatus.COMPLETE,
			matchIndexedAt: null,
			matchIndexedCount: 0,
			matchIndexError: null,
		};

		const findUnique = vi.fn().mockResolvedValue(organization);
		const update = vi.fn();

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					findUnique,
					update,
				},
			} as unknown as PrismaClient,
			session: {
				userId: 'user-1',
				role: 'USER',
				organizationId: 'org-1',
			},
			headers: new Headers(),
		});

		await expect(
			caller.updateProfile({
				priorityFocusKeywords: ['one', 'two', 'three', 'four', 'five', 'six'],
			}),
		).rejects.toThrowError(/priorityFocusKeywords/i);
		expect(update).not.toHaveBeenCalled();
	});

	it('does not bump scoringVersion when only non-scoring fields change', async () => {
		const organization = {
			entityType: $Enums.OrganizationEntityType.NONPROFIT_501C3,
			revenueSources: [$Enums.RevenueSource.GRANTS],
			budgetRange: $Enums.BudgetRange.LT_50K,
			staffRange: $Enums.StaffRange.ONE_TO_FIVE,
			focusAreas: ['education'],
			serviceAreas: ['california'],
			priorityFocusKeywords: [],
			mission: 'Mission',
			description: 'Desc',
			scoringVersion: 3,
			matchIndexStatus: $Enums.MatchIndexStatus.COMPLETE,
			matchIndexedAt: new Date('2024-01-01T00:00:00.000Z'),
			matchIndexedCount: 5,
			matchIndexError: null,
		};

		const findUnique = vi.fn().mockResolvedValue(organization);
		const update = vi.fn().mockResolvedValue({
			...organization,
			description: 'Updated desc',
		});

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					findUnique,
					update,
				},
			} as unknown as PrismaClient,
			session: {
				userId: 'user-1',
				role: 'USER',
				organizationId: 'org-1',
			},
			headers: new Headers(),
		});

		const result = await caller.updateProfile({
			description: 'Updated desc',
		});

		expect(update).toHaveBeenCalled();
		expect(result.scoringVersion).toBe(3);
		expect(result.matchIndexStatus).toBe(organization.matchIndexStatus);
	});
});

describe('organizationRouter.create', () => {
	it('sets scoringVersion to current SCORING_VERSION on create', async () => {
		const create = vi.fn().mockResolvedValue({ id: 'org-1' });

		const caller = organizationRouter.createCaller({
			prisma: {
				organization: {
					create,
				},
			} as unknown as PrismaClient,
			session: null,
			headers: new Headers(),
		});

		await caller.create({
			name: 'Test Org',
			address1: '123 Main St',
			address2: '',
			city: 'Town',
			state: 'CA',
			zipCode: '90210',
			description: 'Desc',
			focusAreas: ['education'],
			mission: 'Mission',
		});

		expect(create).toHaveBeenCalled();
		const data = (create as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.data;
		expect(data.scoringVersion).toBe(SCORING_VERSION);
	});
});
