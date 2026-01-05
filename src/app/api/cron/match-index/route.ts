// /src/app/api/cron/match-index/route.ts
// Vercel Cron hits `/api/cron/match-index` every 5 minutes (see `vercel.json`).
import { type NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/server/cron/assertCronAuth';
import { runOrgMatchIndexSweep } from '@/server/grants/match/runOrgMatchIndexSweep';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
	const auth = validateCronAuth(request);
	if (!auth.authorized) return auth.response;

	try {
		const result = await runOrgMatchIndexSweep(prisma, {
			maxOrgs: 3,
			maxTicksPerOrg: 5,
			batchSize: 250,
		});

		return NextResponse.json({ ok: true, ...result });
	} catch (error) {
		console.error('match-index sweep failed', error);
		return NextResponse.json(
			{ ok: false, error: 'match-index sweep failed' },
			{ status: 500 },
		);
	}
}
