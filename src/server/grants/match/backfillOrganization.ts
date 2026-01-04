import type { PrismaClient } from '@/prisma/generated/client';
import { $Enums } from '@/prisma/generated/client';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';

const DEFAULT_BATCH_SIZE = 500;

type BackfillParams = {
	prisma: PrismaClient;
	organizationId: string;
	batchSize?: number;
};
type MatchIndexStatus = 'NOT_STARTED' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export async function backfillGrantMatchesForOrg({
	prisma,
	organizationId,
	batchSize = DEFAULT_BATCH_SIZE,
}: BackfillParams) {
	const org = (await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { matchIndexStatus: true } as any,
	})) as { matchIndexStatus?: MatchIndexStatus | null } | null;

	if (!org) return;

	await prisma.organization.update({
		where: { id: organizationId },
		data: {
			matchIndexStatus: 'RUNNING',
			matchIndexError: null,
		} as any,
	});

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	let processed = 0;
	try {
		while (true) {
			const grants = await prisma.grant.findMany({
				where: {
					status: { not: $Enums.GrantStatus.CLOSED },
					OR: [{ deadline: null }, { deadline: { gte: today } }],
				},
				select: { id: true },
				take: batchSize,
				skip: processed,
				orderBy: { createdAt: 'asc' },
			});

			if (grants.length === 0) break;

			await ensureGrantMatches({
				prisma,
				organizationId,
				grantIds: grants.map((g) => g.id),
			});

			processed += grants.length;
		}

		await prisma.organization.update({
			where: { id: organizationId },
			data: {
				matchIndexStatus: 'COMPLETE',
				matchIndexedAt: new Date(),
				matchIndexedCount: processed,
				matchIndexError: null,
			} as any,
		});
	} catch (error) {
		await prisma.organization.update({
			where: { id: organizationId },
			data: {
				matchIndexStatus: 'FAILED',
				matchIndexError: error instanceof Error ? error.message : 'Unknown error',
				matchIndexedCount: processed,
			} as any,
		});
		throw error;
	}
}
