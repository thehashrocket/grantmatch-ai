import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Params = {
	params: { id: string };
};

export async function GET(_: Request, { params }: Params) {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const run = await db.grantSyncRun.findUnique({
		where: { id: params.id },
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
		return NextResponse.json({ error: 'Run not found' }, { status: 404 });
	}

	return NextResponse.json(run);
}
