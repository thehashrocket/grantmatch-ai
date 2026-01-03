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

	return (
		<div className="space-y-6">
			<div className="space-y-2">
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
				<p className="text-muted-foreground">Portal ID: {grant.portalId}</p>
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
