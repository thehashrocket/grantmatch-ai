import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
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

	try {
		const run = await db.grantSyncRun.findUnique({
			where: { id },
			select: {
				id: true,
				status: true,
				startedAt: true,
				finishedAt: true,
				recordsFetched: true,
				createdCount: true,
				updatedCount: true,
				unchangedCount: true,
				closedCount: true,
				reopenedCount: true,
			},
		});

		if (!run) {
			return NextResponse.json(
				{ error: 'Run not found', code: 'RUN_NOT_FOUND' },
				{ status: 404 },
			);
		}

		return NextResponse.json(run);
	} catch (error) {
		console.error('Failed to load run status', error);
		return NextResponse.json(
			{ error: 'Failed to load run status', code: 'STATUS_FAILED' },
			{ status: 500 },
		);
	}
}
