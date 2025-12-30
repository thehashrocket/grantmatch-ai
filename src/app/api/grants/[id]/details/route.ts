// src/app/api/grants/[id]/details/route.ts

import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { ensureGrantDetail } from '@/server/grants/ensureGrantDetail';

const DETAIL_TIMEOUT_MS = 10_000;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await withTimeout(ensureGrantDetail(db, id), DETAIL_TIMEOUT_MS).catch(() => {});

  const grant = await db.grant.findUnique({
    where: { id },
    include: { details: true, attachments: true },
  });

  if (!grant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(grant);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timed = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Timed out')), ms);
  });
  return Promise.race([promise, timed]).finally(() => clearTimeout(timeout));
}
