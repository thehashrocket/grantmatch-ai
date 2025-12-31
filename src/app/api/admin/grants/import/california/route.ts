import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { $Enums } from '@/prisma/generated/client';
import { runIngest } from '@/server/grants/ingest/runIngest';
import { caCsvAdapter } from '@/server/grants/sources/caCsvAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST() {
	const session = await getServerSession(authOptions);

	if (!session?.user) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	if (session.user.role !== 'ADMIN') {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
	}

	const existingRun = await db.grantSyncRun.findFirst({
		where: {
			source: $Enums.GrantSource.CALIFORNIA,
			status: $Enums.ImportStatus.IN_PROGRESS,
		},
		select: { id: true },
	});

	if (existingRun) {
		return NextResponse.json(
			{
				error: 'A California import is already running',
				runId: existingRun.id,
			},
			{ status: 409 },
		);
	}

	const { runId } = await runIngest(caCsvAdapter, { fireAndForget: true });

	return NextResponse.json(
		{
			message: 'California import started',
			runId,
		},
		{ status: 202 },
	);
}
