import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import {
	FIT_SCORE_VERSION,
	calculateGrantFitScore,
} from '@/lib/utils/grant-scoring';
import type { Prisma } from '@/prisma/generated/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const BATCH_SIZE = 250;
const TIME_BUDGET_MS = 240_000; // leave buffer under the 5-minute route cap

const fitScoreWhere: Prisma.GrantWhereInput = {
	OR: [{ fitScore: null }, { fitScoreVersion: { lt: FIT_SCORE_VERSION } }],
};

type GrantForScoring = {
	id: string;
	title: string;
	purpose: string | null;
	estimatedTotalFunding: bigint | null;
	awardCeiling: bigint | null;
	awardFloor: bigint | null;
	eligibleApplicants: string | null;
	eligibleGeographies: string | null;
};

function pickFunding(grant: GrantForScoring): bigint | null {
	return (
		grant.estimatedTotalFunding ??
		grant.awardCeiling ??
		grant.awardFloor ??
		null
	);
}

export async function POST(_: NextRequest) {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json(
			{ error: 'Unauthorized', code: 'UNAUTHORIZED' },
			{ status: 401 },
		);
	}

	if (session.user.role !== 'ADMIN') {
		return NextResponse.json(
			{ error: 'Forbidden', code: 'FORBIDDEN' },
			{ status: 403 },
		);
	}

	const startedAt = Date.now();
	let processed = 0;
	let updated = 0;

	try {
		while (Date.now() - startedAt < TIME_BUDGET_MS) {
			const grants = await db.grant.findMany({
				where: fitScoreWhere,
				select: {
					id: true,
					title: true,
					purpose: true,
					estimatedTotalFunding: true,
					awardCeiling: true,
					awardFloor: true,
					eligibleApplicants: true,
					eligibleGeographies: true,
				},
				take: BATCH_SIZE,
			});

			if (grants.length === 0) break;

			const updates = grants.map((grant) => {
				const fitScore = calculateGrantFitScore({
					estimatedTotalFunding: pickFunding(grant),
					eligibleApplicants: grant.eligibleApplicants ?? null,
					eligibleGeographies: grant.eligibleGeographies ?? null,
					purpose: grant.purpose ?? null,
				});

				return db.grant.update({
					where: { id: grant.id },
					data: {
						fitScore,
						fitScoreVersion: FIT_SCORE_VERSION,
						fitScoreComputedAt: new Date(),
					},
				});
			});

			await db.$transaction(updates);
			processed += grants.length;
			updated += grants.length;

			if (grants.length < BATCH_SIZE) break;
		}

		const remaining = await db.grant.count({ where: fitScoreWhere });
		const durationMs = Date.now() - startedAt;

		return NextResponse.json({
			processed,
			updated,
			remaining,
			hasMore: remaining > 0,
			durationMs,
		});
	} catch (error) {
		console.error('Failed to backfill fit scores', error);
		return NextResponse.json(
			{ error: 'Failed to backfill fit scores', code: 'BACKFILL_FAILED' },
			{ status: 500 },
		);
	}
}
