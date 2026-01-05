import {
	describe,
	expect,
	it,
	vi,
	beforeEach,
	type MockedFunction,
} from 'vitest';
import { $Enums } from '@/prisma/generated/client';
import { runOrgMatchIndexSweep } from './runOrgMatchIndexSweep';
import { runOrgMatchIndexTick } from './tickOrgMatchIndex';

vi.mock('./tickOrgMatchIndex', () => {
	const runOrgMatchIndexTick = vi.fn();
	return {
		BATCH_SIZE_DEFAULT: 250,
		runOrgMatchIndexTick,
		OrgTickPrisma: {},
	};
});

const mockedRunOrgMatchIndexTick =
	runOrgMatchIndexTick as unknown as MockedFunction<
		typeof runOrgMatchIndexTick
	>;

describe('runOrgMatchIndexSweep', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('processes orgs up to limits and counts completion', async () => {
		mockedRunOrgMatchIndexTick.mockResolvedValue({
			claimed: true,
			claim: {
				orgId: 'org-1',
				status: $Enums.MatchIndexStatus.RUNNING,
				indexedCount: 0,
				cursor: null,
				claimedAt: null,
				errorsJson: null,
				indexedAt: null,
				error: null,
				claimId: 'claim-1',
				lastTickAt: null,
				lastTickIndexedDelta: 0,
				lastTickRecomputedDelta: 0,
			},
			work: {
				indexedDelta: 0,
				recomputedDelta: 0,
				nextCursor: null,
				done: false,
				errors: [],
			},
			commit: {
				committed: true,
				organization: {
					orgId: 'org-1',
					status: $Enums.MatchIndexStatus.COMPLETE,
					indexedCount: 0,
					cursor: null,
					claimedAt: null,
					errorsJson: null,
					indexedAt: new Date(),
					error: null,
					claimId: 'claim-1',
					lastTickAt: new Date(),
					lastTickIndexedDelta: 0,
					lastTickRecomputedDelta: 0,
				},
			},
		} as Awaited<ReturnType<typeof runOrgMatchIndexTick>>);

		const prisma = {
			organization: {
				findMany: vi.fn().mockResolvedValue([{ id: 'org-1' }, { id: 'org-2' }]),
			},
		} as unknown as Parameters<typeof runOrgMatchIndexSweep>[0];

		const result = await runOrgMatchIndexSweep(prisma, {
			maxOrgs: 3,
			maxTicksPerOrg: 2,
		});

		expect(prisma.organization.findMany).toHaveBeenCalled();
		expect(mockedRunOrgMatchIndexTick).toHaveBeenCalledTimes(2);
		expect(result.orgsConsidered).toBe(2);
		expect(result.completed).toBe(2);
	});

	it('tracks already-claimed orgs', async () => {
		mockedRunOrgMatchIndexTick.mockResolvedValue({
			claimed: false,
			claim: { claimed: false, reason: 'ALREADY_CLAIMED' },
		} as Awaited<ReturnType<typeof runOrgMatchIndexTick>>);

		const prisma = {
			organization: {
				findMany: vi.fn().mockResolvedValue([{ id: 'org-1' }]),
			},
		} as unknown as Parameters<typeof runOrgMatchIndexSweep>[0];

		const result = await runOrgMatchIndexSweep(prisma, {
			maxOrgs: 1,
			maxTicksPerOrg: 1,
		});

		expect(result.alreadyClaimed).toBe(1);
		expect(mockedRunOrgMatchIndexTick).toHaveBeenCalledTimes(1);
	});
});
