import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Script from 'next/script';
import GrantDetailsClient from './GrantDetailsClient';
import { db } from '@/lib/db';
import { ensureGrantDetail } from '@/server/grants/ensureGrantDetail';
import GrantDetailsKick from '@/components/grants/GrantDetailsKick';
import { grantMetadata, grantJsonLd } from '@/lib/seo/grants';

const DETAIL_TIMEOUT_MS = 8_000;

type GrantPageParams = { id: string };

export async function generateMetadata({
	params,
}: {
	params: Promise<GrantPageParams>;
}): Promise<Metadata> {
	const { id } = await params;
	const grant = await db.grant.findUnique({
		where: { id },
		include: { details: true },
	});
	if (!grant) return { title: 'Grant Not Found | GrantMatch AI' };
	return grantMetadata(grant);
}

export default async function GrantDetailsPage({
	params,
}: {
	params: Promise<GrantPageParams>;
}) {
	const { id } = await params;
	await withTimeout(ensureGrantDetail(db, id), DETAIL_TIMEOUT_MS).catch(
		() => {},
	);

	const grant = await db.grant.findUnique({
		where: { id },
		include: { details: true, attachments: true },
	});

	if (!grant) notFound();

	const jsonLd = grantJsonLd(grant);

	return (
		<main className="container mx-auto p-6">
			<Script
				id={`grant-jsonld-${id}`}
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
			/>
			<GrantDetailsKick grantId={id} detailsStatus={grant.detailsStatus} />
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
