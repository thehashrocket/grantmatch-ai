import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(
	_req: Request,
	context: { params: Promise<{ id: string }> },
) {
	const { id } = await context.params;

	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	if (!id) {
		return NextResponse.json({ error: 'Run ID is required' }, { status: 400 });
	}

	const run = await db.grantSyncRun.findUnique({
		where: { id },
		select: {
			id: true,
			source: true,
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
		return NextResponse.json({ error: 'Run not found' }, { status: 404 });
	}

	return NextResponse.json(run);
}
