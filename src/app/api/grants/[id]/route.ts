// /src/app/api/grants/[id]/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
	_req: NextRequest,
	context: { params: Promise<{ id: string }> },
) {
	try {
		const { id } = await context.params;
		const grant = await prisma.grant.findUnique({
			where: { id },
			include: { details: true, attachments: true },
		});

		if (!grant) {
			return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
		}

		return NextResponse.json(grant);
	} catch {
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 },
		);
	}
}
