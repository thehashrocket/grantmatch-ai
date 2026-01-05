// /src/app/grants/[id]/GrantDetailsClient.tsx

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DetailsStatusBadge from '@/components/grants/DetailsStatusBadge';
import GrantDetailedDescription from '@/components/grants/GrantDetailedDescription';
import { EligibilityRequirementsCard } from '@/components/grants/EligibilityRequirementsCard';
import { AdditionalFundingDetailsCard } from '@/components/grants/AdditionalFundingDetailsCard';
import { GrantBasicInfoCard } from '@/components/grants/GrantBasicInfoCard';
import { FundingSummaryCard } from '@/components/grants/FundingSummaryCard';
import type { Prisma } from '@/prisma/generated/client';
import type { GrantMatch } from '@/lib/types/grant';
import { BookmarkButton } from '@/components/grants/BookmarkButton';
import { BookmarkStatusSelect } from '@/components/grants/BookmarkStatusSelect';
import { trpc } from '@/lib/trpc/client';
import type { BookmarkStatus } from '@/lib/types/bookmark';
import { BookmarkMetaEditor } from '@/components/grants/BookmarkMetaEditor';
import { useEffect } from 'react';
import { getFitScoreCategory, getFitScoreColor } from '@/lib/types/grant';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { resolveBackTarget } from '@/lib/utils/return-to';

type GrantData = Prisma.GrantGetPayload<{
	include: { details: true; attachments: true };
}>;

interface GrantDetailsClientProps {
	grantId: string;
	initialGrant: GrantData;
}

export default function GrantDetailsClient({
	grantId,
	initialGrant,
}: GrantDetailsClientProps) {
	const router = useRouter();
	const searchParams = useSearchParams();
	const grant = initialGrant;
	const statusMapInput = { grantIds: [grantId] };
	const { data: statusMap } = trpc.bookmark.statusMap.useQuery(statusMapInput, {
		retry: false,
	});

	const bookmarkStatus = statusMap?.[grantId]?.status as
		| BookmarkStatus
		| undefined;
	const isBookmarked = Boolean(statusMap?.[grantId]);

	const { data: bookmarkList } = trpc.bookmark.list.useQuery(undefined, {
		enabled: isBookmarked,
	});

	const bookmarkEntry = bookmarkList?.items.find(
		(item) => item.grant.id === grantId,
	);

	const utils = trpc.useUtils();
	const ensureMatches = trpc.match.ensureForGrants.useMutation({
		onSuccess: () => {
			utils.match.scoreMap.invalidate({ grantIds: [grantId] });
		},
	});

	const {
		data: scoreMap,
		isLoading: isScoreLoading,
		error: scoreError,
	} = trpc.match.scoreMap.useQuery(
		{ grantIds: [grantId] },
		{
			enabled: Boolean(grantId),
			retry: false,
		},
	);

	const scoreEntry = scoreMap?.[grantId];
	const fitScore = scoreEntry?.fitScore ?? null;
	const fitScoreCategory =
		fitScore !== null ? getFitScoreCategory(fitScore) : null;
	const fitScoreClass =
		fitScoreCategory !== null
			? getFitScoreColor(fitScoreCategory)
			: 'bg-muted text-muted-foreground';
	const returnToParam = searchParams?.get('returnTo');
	const searchParamsWithoutReturnTo = searchParams
		? (() => {
				const next = new URLSearchParams(searchParams.toString());
				next.delete('returnTo');
				return next.toString();
			})()
		: '';
	const backTarget = returnToParam
		? resolveBackTarget(returnToParam)
		: searchParamsWithoutReturnTo
			? `/dashboard?${searchParamsWithoutReturnTo}`
			: '/dashboard';

	useEffect(() => {
		if (scoreError) return;
		if (isScoreLoading) return;
		if (scoreEntry) return;
		if (ensureMatches.isPending) return;
		ensureMatches.mutate({ grantIds: [grantId] });
	}, [ensureMatches, grantId, isScoreLoading, scoreEntry, scoreError]);

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Button
					variant="outline"
					className="px-2 text-sm"
					onClick={() => {
						if (returnToParam) {
							router.push(backTarget);
							return;
						}
						if (window.history.length > 1) {
							router.back();
							return;
						}
						router.push(backTarget);
					}}
				>
					← Back to results
				</Button>
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-3xl font-bold tracking-tight">{grant.title}</h1>
						<DetailsStatusBadge
							status={grant.detailsStatus as GrantMatch['detailsStatus']}
						/>
					</div>
					<div className="flex flex-wrap gap-3">
						<BookmarkButton
							grantId={grantId}
							statusMapInput={statusMapInput}
							isBookmarked={isBookmarked}
							status={bookmarkStatus}
						/>
						{isBookmarked ? (
							<BookmarkStatusSelect
								grantId={grantId}
								status={bookmarkStatus}
								statusMapInput={statusMapInput}
							/>
						) : null}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
					<span>Fit score:</span>
					<span
						className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${fitScoreClass}`}
					>
						{fitScore !== null ? `${fitScore.toFixed(1)}/10` : '—'}
					</span>
					{scoreEntry?.explanation && (
						<span className="text-xs text-muted-foreground">
							{scoreEntry.explanation}
						</span>
					)}
				</div>
				{grant.detailsStatus === 'FETCHING' && (
					<p className="text-sm text-muted-foreground">
						Fetching details in the background…
					</p>
				)}
			</div>

			{isBookmarked ? (
				<BookmarkMetaEditor
					grantId={grantId}
					initialNote={bookmarkEntry?.note}
					initialTags={bookmarkEntry?.tags}
					statusMapInput={statusMapInput}
				/>
			) : null}

			<div className="grid gap-6 md:grid-cols-2">
				<GrantBasicInfoCard grant={grant} />

				<FundingSummaryCard grant={grant} />

				{grant.details && (
					<>
						<Card className="md:col-span-2">
							<CardHeader>
								<CardTitle>Detailed Description</CardTitle>
							</CardHeader>
							<CardContent>
								<GrantDetailedDescription
									description={
										grant.details.description ?? grant.details.synopsisHtml
									}
								/>
							</CardContent>
						</Card>

						<EligibilityRequirementsCard grant={grant} />

						<AdditionalFundingDetailsCard grant={grant} />
					</>
				)}
			</div>
		</div>
	);
}
