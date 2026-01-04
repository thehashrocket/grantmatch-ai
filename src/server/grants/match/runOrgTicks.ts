import { $Enums, type PrismaClient } from '@/prisma/generated/client';
import { runOrgMatchIndexTick } from './tickOrgMatchIndex';

type PrismaLike = Pick<
	PrismaClient,
	'organization' | 'grant' | 'grantMatch' | '$queryRaw' | '$transaction'
>;

export async function runOrgTicksOnce(
	prisma: PrismaLike,
	limit = 5,
	opts?: { batchSize?: number; staleAfterSeconds?: number },
) {
	const candidates = await prisma.organization.findMany({
		where: {
			matchIndexStatus: {
				in: [
					$Enums.MatchIndexStatus.RUNNING,
					$Enums.MatchIndexStatus.NOT_STARTED,
					$Enums.MatchIndexStatus.FAILED,
				],
			},
		},
		select: { id: true },
		take: limit,
	});

	const results = [];
	for (const org of candidates) {
		// eslint-disable-next-line no-await-in-loop
		const result = await runOrgMatchIndexTick(prisma, org.id, opts);
		results.push({ organizationId: org.id, result });
	}

	return results;
}
