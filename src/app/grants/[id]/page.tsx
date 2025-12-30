// Grant page
// Show the grant details
// Hit the API to either get the grant details from the databhase for fetch them from n8n

import { notFound } from 'next/navigation';
import GrantDetailsClient from './GrantDetailsClient';
import { db } from '@/lib/db';
import { ensureFederalGrantDetail } from '@/server/grants/ensureFederalGrantDetail';

const DETAIL_TIMEOUT_MS = 8_000;

type GrantPageParams = { id: string };

export default async function GrantDetailsPage({ params }: { params: Promise<GrantPageParams> }) {
  const { id } = await params;
  await withTimeout(ensureFederalGrantDetail(db, id), DETAIL_TIMEOUT_MS).catch(() => {});

  const grant = await db.grant.findUnique({
    where: { id },
    include: { details: true }
  });

  if (!grant) notFound();

  return (
    <main className="container mx-auto p-6">
      <GrantDetailsClient grantId={id} initialGrant={grant} />
    </main>
  );
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeout: NodeJS.Timeout;
  const timed = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error('Timed out')), ms);
  });
  return Promise.race([promise, timed]).finally(() => clearTimeout(timeout));
}
