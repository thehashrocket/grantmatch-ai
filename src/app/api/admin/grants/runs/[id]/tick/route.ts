import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { runTick } from '@/server/grants/ingest/tickIngest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
	_: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	const session = await getServerSession(authOptions);
	const { id } = await context.params;

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

	if (!id) {
		return NextResponse.json(
			{ error: 'Run ID is required', code: 'RUN_ID_REQUIRED' },
			{ status: 400 },
		);
	}

	const tick = await runTick(db, id);

	if (!tick.claimed) {
		const reason = tick.claim?.reason ?? 'TICK_ALREADY_CLAIMED';
		const status =
			reason === 'NOT_FOUND' ? 404 : reason === 'NOT_IN_PROGRESS' ? 409 : 409;
		return NextResponse.json(
			{
				code: reason,
				run: tick.claim?.run ?? null,
			},
			{ status },
		);
	}

	const result = tick.result;
	if (!result) {
		return NextResponse.json(
			{ error: 'Tick failed to commit', code: 'COMMIT_FAILED' },
			{ status: 500 },
		);
	}

	if (!result.committed) {
		return NextResponse.json(
			{
				code: result.reason,
				run: null,
			},
			{ status: 409 },
		);
	}

	const run = result.run;
	return NextResponse.json({
		runId: run.id,
		status: run.status,
		cursor: run.schema.cursor ?? null,
		recordsFetched: run.recordsFetched,
		createdCount: run.createdCount,
		updatedCount: run.updatedCount,
		unchangedCount: run.unchangedCount,
		closedCount: run.closedCount,
		reopenedCount: run.reopenedCount,
		finishedAt: run.finishedAt,
		errorsJson: run.errorsJson,
	});
}
