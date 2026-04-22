import type { Metadata } from 'next';
import type { Grant, GrantDetail } from '@/prisma/generated/client';

type GrantWithDetails = Grant & { details: GrantDetail | null };

const BASE_URL =
	process.env.NEXT_PUBLIC_APP_URL ?? 'https://aigrantmatch.com';

export function truncateDescription(
	text: string | null | undefined,
	maxLen = 160,
): string {
	if (!text) return '';
	return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1)}…`;
}

export function grantMetadata(grant: GrantWithDetails): Metadata {
	const rawDescription =
		grant.details?.description ??
		grant.details?.purpose ??
		grant.purpose;
	const description = truncateDescription(rawDescription);
	const canonical = `${BASE_URL}/grants/${grant.id}`;
	const isClosed =
		grant.deadlineType === 'CLOSED' ||
		(grant.deadline !== null && grant.deadline < new Date());

	return {
		title: `${grant.title} | GrantMatch AI`,
		description: description || undefined,
		alternates: { canonical },
		openGraph: {
			title: `${grant.title} | GrantMatch AI`,
			description: description || undefined,
			type: 'article',
			url: canonical,
		},
		robots: isClosed ? 'noindex' : 'index, follow',
	};
}

export function grantJsonLd(grant: GrantWithDetails): Record<string, unknown> {
	const description =
		grant.details?.description ??
		grant.details?.purpose ??
		grant.purpose;
	const fundingAmount =
		grant.estimatedTotalFunding ?? grant.awardCeiling ?? grant.awardFloor;

	return {
		'@context': 'https://schema.org',
		'@type': 'CreativeWork',
		name: grant.title,
		...(description && { description }),
		url: grant.url,
		dateModified: grant.updatedAt?.toISOString(),
		...(grant.deadline && { expires: grant.deadline.toISOString() }),
		...(fundingAmount && {
			offers: {
				'@type': 'Offer',
				price: fundingAmount.toString(),
				priceCurrency: 'USD',
			},
		}),
		...(grant.grantor && {
			publisher: { '@type': 'Organization', name: grant.grantor },
		}),
	};
}
