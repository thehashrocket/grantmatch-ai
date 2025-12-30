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

type GrantData = Prisma.GrantGetPayload<{
	include: { details: true; attachments: true };
}>;

interface GrantDetailsClientProps {
	grantId: string;
	initialGrant: GrantData;
}

export default function GrantDetailsClient({
	initialGrant,
}: GrantDetailsClientProps) {
	const grant = initialGrant;

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-2">
					<h1 className="text-3xl font-bold tracking-tight">{grant.title}</h1>
					<DetailsStatusBadge
						status={grant.detailsStatus as GrantMatch['detailsStatus']}
					/>
				</div>
				<p className="text-muted-foreground">Portal ID: {grant.portalId}</p>
				{grant.detailsStatus === 'FETCHING' && (
					<p className="text-sm text-muted-foreground">
						Fetching details in the background…
					</p>
				)}
			</div>

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
