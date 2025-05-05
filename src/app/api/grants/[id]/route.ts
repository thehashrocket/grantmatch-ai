import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grant = await prisma.grant.findUnique({
      where: { id: params.id },
      include: { details: true },
    });

    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 });
    }

    return NextResponse.json(grant);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
