import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublicGrants } from '@/lib/public-grants';
import { getFundingAmountInfo } from '@/lib/utils/funding-amount';
import { formatDeadline } from '@/lib/utils/format-deadline';

export const metadata: Metadata = {
	title: 'Browse Grants for Nonprofits | GrantMatch AI',
	description:
		'Discover federal, California, and Ohio grants for nonprofits. Filter by source, deadline, and funding amount — no account required.',
	alternates: { canonical: 'https://aigrantmatch.com/grants' },
	openGraph: {
		title: 'Browse Grants for Nonprofits | GrantMatch AI',
		description:
			'Discover federal, California, and Ohio grants for nonprofits. Filter by source, deadline, and funding amount — no account required.',
		type: 'website',
	},
};

const SOURCE_PAGES = [
	{ href: '/grants/source/federal', label: 'Federal Grants' },
	{ href: '/grants/source/california', label: 'California Grants' },
	{ href: '/grants/source/ohio', label: 'Ohio Grants' },
	{ href: '/grants/source/other', label: 'Other Grants' },
];

function formatFunding(
	estimatedTotalFunding: bigint | null,
	awardCeiling: bigint | null,
	awardFloor: bigint | null,
) {
	const info = getFundingAmountInfo({
		estimatedTotalFunding: estimatedTotalFunding ? Number(estimatedTotalFunding) : null,
		awardCeiling: awardCeiling ? Number(awardCeiling) : null,
		awardFloor: awardFloor ? Number(awardFloor) : null,
	});
	return info.status === 'MISSING' ? null : info.display;
}

export default async function GrantsBrowsePage() {
	const { grants, total, totalPages } = await getPublicGrants({ page: 1 });

	return (
		<div className="max-w-5xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<div className="mb-10">
				<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
					Grants for Nonprofits
				</h1>
				<p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
					Browse {total.toLocaleString()} open grants from federal and state
					funding sources. No account required to explore opportunities.
				</p>
			</div>

			<div className="flex flex-wrap gap-3 mb-10">
				{SOURCE_PAGES.map(({ href, label }) => (
					<Link
						key={href}
						href={href}
						className="inline-flex items-center px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
					>
						{label}
					</Link>
				))}
			</div>

			<div className="space-y-4">
				{grants.map((grant) => {
					const funding = formatFunding(
						grant.estimatedTotalFunding,
						grant.awardCeiling,
						grant.awardFloor,
					);
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
									<span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
										{grant.source.charAt(0) + grant.source.slice(1).toLowerCase()}
									</span>
								</div>
							</div>
						</Link>
					);
				})}
			</div>

			{totalPages > 1 && (
				<p className="mt-8 text-sm text-center text-gray-500 dark:text-gray-400">
					Showing first 24 of {total.toLocaleString()} grants.{' '}
					<Link href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">
						Sign up free
					</Link>{' '}
					to search, filter, and get AI-matched recommendations.
				</p>
			)}
		</div>
	);
}
