import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { $Enums } from '@/prisma/generated/client';
import { importCaliforniaGrants } from '@/server/grants/importCaliforniaGrants';
import fs from 'node:fs/promises';
import path from 'node:path';

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
			source: $Enums.GrantSource.CALIFORNIA,
			status: $Enums.ImportStatus.IN_PROGRESS,
		},
		orderBy: { startedAt: 'desc' },
	});

	if (activeRun) {
		return NextResponse.json(
			{
				error: 'A California import is already in progress',
				runId: activeRun.id,
			},
			{ status: 409 },
		);
	}

	try {
		const filePath = path.join(
			process.cwd(),
			'source_files',
			'california-grants-portal-data.csv',
		);

		const downloadResponse = await fetch(
			'https://data.ca.gov/dataset/e1b1c799-cdd4-4219-af6d-93b79747fffb/resource/111c8c88-21f6-453c-ae2c-b4785a0624f5/download/california-grants-portal-data.csv',
		);

		if (!downloadResponse.ok) {
			return NextResponse.json(
				{
					error: 'Failed to download California grants CSV',
					status: downloadResponse.status,
				},
				{ status: 502 },
			);
		}

		const csvBuffer = Buffer.from(await downloadResponse.arrayBuffer());
		await fs.mkdir(path.dirname(filePath), { recursive: true });
		await fs.writeFile(filePath, csvBuffer);

		const { runId } = await importCaliforniaGrants({ fireAndForget: true });
		return NextResponse.json({ runId }, { status: 202 });
	} catch (error) {
		console.error('Failed to start California import:', error);
		return NextResponse.json(
			{ error: 'Failed to start California import' },
			{ status: 500 },
		);
	}
}
