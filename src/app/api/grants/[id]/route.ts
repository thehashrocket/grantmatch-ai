import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const grant = await prisma.grant.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    return NextResponse.json(grant);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
