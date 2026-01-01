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
		const result = await runGrantSync('federal');

		if (!result.run) {
			return NextResponse.json(
				{ ok: false, error: 'No run returned', source: 'federal' },
				{ status: 500 },
			);
		}

		return NextResponse.json(
			{
				ok: true,
				source: 'federal',
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
		console.error('Cron federal sync failed', error);
		return NextResponse.json(
			{ ok: false, error: 'Cron federal sync failed', source: 'federal' },
			{ status: 500 },
		);
	}
}
