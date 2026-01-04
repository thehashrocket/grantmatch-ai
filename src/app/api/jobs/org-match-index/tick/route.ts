import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { $Enums } from '@/prisma/generated/client';
import {
	runOrgMatchIndexTick,
	startOrgMatchIndex,
} from '@/server/grants/match/tickOrgMatchIndex';

const DEFAULT_LIMIT = 5;

export async function POST(req: Request) {
	const secret = process.env.JOB_SECRET;
	if (!secret || req.headers.get('x-job-secret') !== secret) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const url = new URL(req.url);
	const limit = Math.min(
		Math.max(Number(url.searchParams.get('limit')) || DEFAULT_LIMIT, 1),
		20,
	);
	const batchSize = Number(url.searchParams.get('batchSize')) || undefined;

	const candidates = await db.organization.findMany({
		where: {
			matchIndexStatus: {
				in: [
					$Enums.MatchIndexStatus.NOT_STARTED,
					$Enums.MatchIndexStatus.RUNNING,
					$Enums.MatchIndexStatus.FAILED,
				],
			},
		},
		orderBy: { updatedAt: 'asc' },
		take: limit,
		select: { id: true, matchIndexStatus: true },
	});

	const results = [];

	for (const org of candidates) {
		try {
			if (
				org.matchIndexStatus === $Enums.MatchIndexStatus.NOT_STARTED ||
				org.matchIndexStatus === $Enums.MatchIndexStatus.FAILED
			) {
				await startOrgMatchIndex(db, org.id);
			}

			const tick = await runOrgMatchIndexTick(db, org.id, {
				batchSize,
			});

			results.push({ organizationId: org.id, tick });
		} catch (error) {
			results.push({
				organizationId: org.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}

	return NextResponse.json({
		count: results.length,
		results,
	});
}
