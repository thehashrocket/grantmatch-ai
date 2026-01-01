import { type NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { db } from '@/lib/db';
import { authOptions } from '@/lib/auth';
import { $Enums } from '@/prisma/generated/client';
import { startTickIngest } from '@/server/grants/ingest/tickIngest';
import { caCsvAdapter } from '@/server/grants/sources/caCsvAdapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

	try {
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
					code: 'RUN_ALREADY_IN_PROGRESS',
					runId: existingRun.id,
				},
				{ status: 409 },
			);
		}

		const { runId } = await startTickIngest(db, caCsvAdapter);

		return NextResponse.json(
			{
				message: 'California import started',
				runId,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error('Failed to start California import', error);
		return NextResponse.json(
			{ error: 'Failed to start California import', code: 'START_FAILED' },
			{ status: 500 },
		);
	}
}
