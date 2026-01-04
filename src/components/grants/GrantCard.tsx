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
	actionSlot?: React.ReactNode;
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export function GrantCard({ grant, actionSlot }: GrantCardProps) {
	const category = getFitScoreCategory(grant.fitScore);
	const colorClasses = getFitScoreColor(category);
	const flagInfo = getFlagInfo(grant.source);
	const deadlineLabel = grant.deadline
		? formatDate(grant.deadline)
		: 'Deadline not provided';
	const deadlineBadge = (() => {
		if (!grant.deadline) {
			return {
				label: 'Deadline TBD',
				className: 'bg-slate-100 text-slate-800',
			};
		}
		const daysUntil = grant.daysUntilDeadline ?? null;
		if (daysUntil === null) {
			return {
				label: `Due ${deadlineLabel}`,
				className: 'bg-slate-100 text-slate-800',
			};
		}
		if (daysUntil < 0) {
			return {
				label: 'Deadline passed',
				className: 'bg-rose-100 text-rose-800',
			};
		}
		if (daysUntil === 0) {
			return { label: 'Due today', className: 'bg-amber-100 text-amber-800' };
		}
		if (daysUntil <= 14) {
			return {
				label: `Due in ${daysUntil} days`,
				className: 'bg-amber-100 text-amber-800',
			};
		}
		return {
			label: `Due in ${daysUntil} days`,
			className: 'bg-emerald-100 text-emerald-800',
		};
	})();

	return (
		<div className="relative">
			<Card className="transition-shadow hover:shadow-lg">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
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
								{deadlineBadge ? (
									<Badge className={deadlineBadge.className}>
										{deadlineBadge.label}
									</Badge>
								) : null}
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
						<div className="flex flex-col items-end gap-3 text-right">
							{actionSlot}
							<FundingAmount
								estimatedTotalFunding={grant.estimatedTotalFunding}
								awardFloor={grant.awardFloor}
								awardCeiling={grant.awardCeiling}
								fundingAmount={grant.fundingAmount}
							/>
							<div className="text-sm text-muted-foreground">
								{grant.deadline
									? `Deadline: ${deadlineLabel}`
									: 'Deadline not provided'}
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
