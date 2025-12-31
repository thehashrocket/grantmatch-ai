import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { syncFederalGrants } from '@/server/grants/syncFederalGrants';
import { db } from '@/lib/db';
import { $Enums } from '@/prisma/generated/client';

export async function POST() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const activeRun = await db.grantSyncRun.findFirst({
		where: {
			source: $Enums.GrantSource.FEDERAL,
			status: $Enums.ImportStatus.IN_PROGRESS,
		},
		orderBy: { startedAt: 'desc' },
	});

	if (activeRun) {
		return NextResponse.json(
			{
				error: 'A federal sync is already in progress',
				runId: activeRun.id,
			},
			{ status: 409 },
		);
	}

	try {
		const { runId } = await syncFederalGrants({ fireAndForget: true });

		return NextResponse.json({ runId }, { status: 202 });
	} catch (error) {
		console.error('Failed to start federal sync:', error);
		return NextResponse.json(
			{ error: 'Failed to start federal sync' },
			{ status: 500 },
		);
	}
}
