// Grant page
// Show the grant details
// Hit the API to either get the grant details from the databhase for fetch them from n8n

import { notFound } from 'next/navigation';
import GrantDetailsClient from './GrantDetailsClient';
import { db } from '@/lib/db';

export default async function GrantDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  // Fetch the basic grant info (with details if present)
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

