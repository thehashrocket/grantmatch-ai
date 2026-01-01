import { type NextRequest, NextResponse } from 'next/server';
import { validateCronAuth } from '@/server/cron/assertCronAuth';
import { runGrantSync } from '@/server/grants/cron/runGrantSync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
	const auth = validateCronAuth(request);
	if (!auth.authorized) return auth.response;

	try {
		const result = await runGrantSync('california');

		if (!result.run) {
			return NextResponse.json(
				{ ok: false, error: 'No run returned', source: 'california' },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				source: 'california',
				skipped: result.skipped ?? false,
				reason: result.reason,
				runId: result.run.runId,
				status: result.run.status,
				startedAt: result.run.startedAt.toISOString(),
				finishedAt: result.run.finishedAt
					? result.run.finishedAt.toISOString()
					: null,
				counts: {
					recordsFetched: result.run.recordsFetched,
					created: result.run.createdCount,
					updated: result.run.updatedCount,
					unchanged: result.run.unchangedCount,
					closed: result.run.closedCount,
					reopened: result.run.reopenedCount,
				},
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error('Cron California sync failed', error);
		return NextResponse.json(
			{ ok: false, error: 'Cron California sync failed', source: 'california' },
			{ status: 500 },
		);
	}
}
