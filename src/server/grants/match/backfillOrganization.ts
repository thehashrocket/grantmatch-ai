import type { Prisma, PrismaClient } from '@/prisma/generated/client';
import { $Enums } from '@/prisma/generated/client';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';

const DEFAULT_BATCH_SIZE = 500;

type BackfillParams = {
	prisma: PrismaClient;
	organizationId: string;
	batchSize?: number;
};

export async function backfillGrantMatchesForOrg({
	prisma,
	organizationId,
	batchSize = DEFAULT_BATCH_SIZE,
}: BackfillParams) {
	const org = (await prisma.organization.findUnique({
		where: { id: organizationId },
		select: { matchIndexStatus: true },
	})) || { matchIndexStatus: null };

	if (!org) return;

	const runningUpdate: Prisma.OrganizationUpdateInput = {
		matchIndexStatus: 'RUNNING',
		matchIndexError: null,
	};

	await prisma.organization.update({
		where: { id: organizationId },
		data: runningUpdate,
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

		const completeUpdate: Prisma.OrganizationUpdateInput = {
			matchIndexStatus: 'COMPLETE',
			matchIndexedAt: new Date(),
			matchIndexedCount: processed,
			matchIndexError: null,
		};

		await prisma.organization.update({
			where: { id: organizationId },
			data: completeUpdate,
		});
	} catch (error) {
		const failedUpdate: Prisma.OrganizationUpdateInput = {
			matchIndexStatus: 'FAILED',
			matchIndexError: error instanceof Error ? error.message : 'Unknown error',
			matchIndexedCount: processed,
		};

		await prisma.organization.update({
			where: { id: organizationId },
			data: failedUpdate,
		});
		throw error;
	}
}
