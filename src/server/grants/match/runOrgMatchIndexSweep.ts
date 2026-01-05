// src/server/grants/match/runOrgMatchIndexSweep.ts

import { $Enums } from '@/prisma/generated/client';
import {
	BATCH_SIZE_DEFAULT,
	type OrgTickPrisma,
	runOrgMatchIndexTick,
} from './tickOrgMatchIndex';

type SweepOptions = {
	maxOrgs?: number;
	maxTicksPerOrg?: number;
	batchSize?: number;
};

export async function runOrgMatchIndexSweep(
	prisma: OrgTickPrisma,
	opts?: SweepOptions,
): Promise<{
	orgsConsidered: number;
	orgsProcessed: number;
	ticksRun: number;
	completed: number;
	alreadyClaimed: number;
	errors: Array<{ orgId?: string; message: string }>;
}> {
	const maxOrgs = opts?.maxOrgs ?? 5;
	const maxTicksPerOrg = opts?.maxTicksPerOrg ?? 2;
	const batchSize = opts?.batchSize ?? BATCH_SIZE_DEFAULT;

	const orgs = await prisma.organization.findMany({
		where: {
			matchIndexStatus: {
				in: [
					$Enums.MatchIndexStatus.RUNNING,
					$Enums.MatchIndexStatus.NOT_STARTED,
					$Enums.MatchIndexStatus.FAILED,
				],
			},
		},
		orderBy: [{ matchIndexStatus: 'asc' }, { updatedAt: 'desc' }],
		take: maxOrgs,
		select: { id: true },
	});

	let orgsProcessed = 0;
	let ticksRun = 0;
	let completed = 0;
	let alreadyClaimed = 0;
	const errors: Array<{ orgId?: string; message: string }> = [];

	for (const org of orgs) {
		let localTicks = 0;
		while (localTicks < maxTicksPerOrg) {
			localTicks += 1;
			try {
				const tick = await runOrgMatchIndexTick(prisma, org.id, {
					batchSize,
				});

				if (!tick.claimed) {
					if (tick.claim?.reason === 'ALREADY_CLAIMED') {
						alreadyClaimed += 1;
					}
					break;
				}

				ticksRun += 1;
				orgsProcessed += 1;

				if (
					tick.commit?.committed &&
					tick.commit.organization.status === $Enums.MatchIndexStatus.COMPLETE
				) {
					completed += 1;
					break;
				}

				if (
					tick.commit?.committed &&
					tick.commit.organization.status === $Enums.MatchIndexStatus.FAILED
				) {
					break;
				}
			} catch (error) {
				errors.push({
					orgId: org.id,
					message:
						error instanceof Error ? error.message : 'Unknown sweep error',
				});
				break;
			}
		}
	}

	return {
		orgsConsidered: orgs.length,
		orgsProcessed,
		ticksRun,
		completed,
		alreadyClaimed,
		errors,
	};
}
