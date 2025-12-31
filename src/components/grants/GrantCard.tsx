// src/components/grants/GrantCard.tsx

import Link from 'next/link';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	getFitScoreCategory,
	getFitScoreColor,
	type GrantMatch,
} from '@/lib/types/grant';
import { ExternalLink } from 'lucide-react';
import { getFlagInfo } from '@/lib/utils/flag-utils';
import Image from 'next/image';
import DetailsStatusBadge from '@/components/grants/DetailsStatusBadge';
import { FundingAmount } from '@/components/grants/FundingAmount';

interface GrantCardProps {
	grant: GrantMatch;
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export function GrantCard({ grant }: GrantCardProps) {
	const category = getFitScoreCategory(grant.fitScore);
	const colorClasses = getFitScoreColor(category);
	const flagInfo = getFlagInfo(grant.source);

	return (
		<div className="relative">
			<Card className="transition-shadow hover:shadow-lg">
				<CardHeader>
					<div className="flex items-start justify-between">
						<div className="space-y-1.5">
							<CardTitle className="text-xl flex items-center gap-2">
								{flagInfo && (
									<Image
										src={flagInfo.flagPath}
										alt={`${flagInfo.label} flag`}
										width={20}
										height={14}
										className=""
									/>
								)}
								<Link href={grant.internalUrl} className="hover:underline">
									{grant.title}
								</Link>
							</CardTitle>
							<CardDescription className="flex flex-wrap items-center gap-2">
								<Badge className={colorClasses}>
									Fit Score: {grant.fitScore.toFixed(1)}
								</Badge>
								<DetailsStatusBadge status={grant.detailsStatus} />
								<a
									href={grant.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
								>
									<ExternalLink className="h-3 w-3" />
									<span>View Original</span>
								</a>
							</CardDescription>
						</div>
						<div className="text-right">
							<FundingAmount
								estimatedTotalFunding={grant.estimatedTotalFunding}
								awardFloor={grant.awardFloor}
								awardCeiling={grant.awardCeiling}
								fundingAmount={grant.fundingAmount}
							/>
							<div className="text-sm text-muted-foreground">
								Due {formatDate(grant.deadline)}
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground">{grant.explanation}</p>
				</CardContent>
			</Card>
		</div>
	);
}
