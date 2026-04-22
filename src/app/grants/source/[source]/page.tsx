import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { GrantSource } from '@/prisma/generated/client';
import { getPublicGrants } from '@/lib/public-grants';
import { getFundingAmountInfo } from '@/lib/utils/funding-amount';
import { formatDeadline } from '@/lib/utils/format-deadline';

type SourceSlug = 'federal' | 'california' | 'ohio' | 'other';

const SLUG_TO_SOURCE: Record<SourceSlug, GrantSource> = {
	federal: 'FEDERAL',
	california: 'CALIFORNIA',
	ohio: 'OHIO',
	other: 'OTHER',
};

const SOURCE_LABELS: Record<SourceSlug, string> = {
	federal: 'Federal',
	california: 'California',
	ohio: 'Ohio',
	other: 'Other',
};

const SOURCE_DESCRIPTIONS: Record<SourceSlug, string> = {
	federal:
		'Federal grants from U.S. government agencies including HHS, DOJ, EPA, NEA, and more.',
	california:
		'State grants from California agencies and foundations for nonprofits serving California communities.',
	ohio: 'State grants from Ohio agencies and foundations for nonprofits serving Ohio communities.',
	other: 'Additional grants from foundations and funding sources beyond federal and state programs.',
};

type Props = { params: Promise<{ source: string }> };

export async function generateStaticParams() {
	return (['federal', 'california', 'ohio', 'other'] as SourceSlug[]).map(
		(source) => ({ source }),
	);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { source } = await params;
	const slug = source as SourceSlug;
	if (!SLUG_TO_SOURCE[slug]) return { title: 'Not Found | GrantMatch AI' };
	const label = SOURCE_LABELS[slug];
	const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://aigrantmatch.com';
	return {
		title: `${label} Grants for Nonprofits | GrantMatch AI`,
		description: SOURCE_DESCRIPTIONS[slug],
		alternates: { canonical: `${baseUrl}/grants/source/${slug}` },
		openGraph: {
			title: `${label} Grants for Nonprofits | GrantMatch AI`,
			description: SOURCE_DESCRIPTIONS[slug],
			type: 'website',
		},
	};
}

export default async function SourceFacetPage({ params }: Props) {
	const { source } = await params;
	const slug = source as SourceSlug;
	const grantSource = SLUG_TO_SOURCE[slug];
	if (!grantSource) notFound();

	const { grants, total } = await getPublicGrants({ source: grantSource, page: 1 });
	const label = SOURCE_LABELS[slug];

	return (
		<div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<div className="mb-6">
				<Link
					href="/grants"
					className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
				>
					← All grants
				</Link>
			</div>

			<div className="mb-10">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
					{label} Grants for Nonprofits
				</h1>
				<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
					{SOURCE_DESCRIPTIONS[slug]} Showing {total.toLocaleString()} open
					opportunities.
				</p>
			</div>

			<div className="space-y-4">
				{grants.map((grant) => {
					const info = getFundingAmountInfo({
						estimatedTotalFunding: grant.estimatedTotalFunding
							? Number(grant.estimatedTotalFunding)
							: null,
						awardCeiling: grant.awardCeiling ? Number(grant.awardCeiling) : null,
						awardFloor: grant.awardFloor ? Number(grant.awardFloor) : null,
					});
					const funding = info.status === 'MISSING' ? null : info.display;

					return (
						<Link
							key={grant.id}
							href={`/grants/${grant.id}`}
							className="block p-5 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-400 dark:hover:border-blue-600 transition-colors"
						>
							<div className="flex items-start justify-between gap-4">
								<div className="min-w-0">
									<h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
										{grant.title}
									</h2>
									<p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
										{grant.grantor}
									</p>
									{grant.purpose && (
										<p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
											{grant.purpose}
										</p>
									)}
								</div>
								<div className="shrink-0 text-right space-y-1">
									{funding && (
										<p className="text-sm font-medium text-green-700 dark:text-green-400">
											{funding}
										</p>
									)}
									<p className="text-xs text-gray-500 dark:text-gray-400">
										{formatDeadline(grant.deadline, grant.deadlineType)}
									</p>
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{total === 0 && (
				<p className="text-center text-gray-500 dark:text-gray-400 py-12">
					No open grants found for this source.
				</p>
			)}

			{total > 24 && (
				<p className="mt-8 text-sm text-center text-gray-500 dark:text-gray-400">
					Showing first 24 of {total.toLocaleString()} grants.{' '}
					<Link
						href="/register"
						className="text-blue-600 dark:text-blue-400 hover:underline"
					>
						Sign up free
					</Link>{' '}
					to search all opportunities with AI-powered matching.
				</p>
			)}
		</div>
	);
}
