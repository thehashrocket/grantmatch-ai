// src/components/grants/GrantCard.tsx

import Link from 'next/link';
import { useState } from 'react';
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
import { AlertTriangle, Check, ExternalLink, Minus } from 'lucide-react';
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
	const [showReasons, setShowReasons] = useState(false);
	const category = getFitScoreCategory(grant.fitScore);
	const colorClasses = getFitScoreColor(category);
	const flagInfo = getFlagInfo(grant.source);
	const summaryText = grant.scoreSummary ?? grant.explanation;
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
	const fitLabel =
		category === 'high'
			? 'Strong'
			: category === 'medium'
				? 'Moderate'
				: 'Weak';
	const confidence = grant.confidence ?? 'MEDIUM';
	const confidenceClass =
		confidence === 'HIGH'
			? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
			: confidence === 'LOW'
				? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
				: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100';
	const reasonPreview =
		grant.reasons
			?.slice(0, 2)
			.map((reason) => reason.label)
			.join(' • ') ?? 'See details';

	const reasonIcon = (strength: string) => {
		switch (strength) {
			case 'strong':
				return <Check className="h-4 w-4 text-emerald-600" />;
			case 'medium':
				return <Check className="h-4 w-4 text-emerald-500" />;
			case 'weak':
				return <AlertTriangle className="h-4 w-4 text-amber-500" />;
			default:
				return <Minus className="h-4 w-4 text-muted-foreground" />;
		}
	};

	return (
		<div className="relative">
			<Card className="transition-shadow hover:shadow-lg">
				<CardHeader>
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-2 flex-1">
							<CardTitle className="text-xl flex items-start gap-2 leading-snug">
								{flagInfo && (
									<Image
										src={flagInfo.flagPath}
										alt={`${flagInfo.label} flag`}
										width={20}
										height={14}
										className=""
									/>
								)}
								<Link
									href={grant.internalUrl}
									className="hover:underline line-clamp-2"
								>
									{grant.title}
								</Link>
							</CardTitle>
							<CardDescription className="flex flex-wrap items-center gap-2">
								<Badge className={colorClasses}>
									{fitLabel} • {grant.fitScore.toFixed(1)}/10
								</Badge>
								<Badge
									className={confidenceClass}
									title="Confidence reflects how much eligibility, funding, and deadline info we have for this grant."
								>
									Confidence:{' '}
									{confidence
										.toLowerCase()
										.replace(/^\w/, (c) => c.toUpperCase())}
								</Badge>
								{deadlineBadge ? (
									<Badge className={deadlineBadge.className}>
										{deadlineBadge.label}
									</Badge>
								) : null}
								<DetailsStatusBadge status={grant.detailsStatus} />
							</CardDescription>
						</div>
						<div className="flex flex-col items-end gap-3 text-right min-w-[180px]">
							<div className="flex items-center gap-2">
								{actionSlot}
								<a
									href={grant.url}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
								>
									<ExternalLink className="h-3 w-3" />
									<span>View Original</span>
								</a>
							</div>
							<FundingAmount
								estimatedTotalFunding={grant.estimatedTotalFunding}
								awardFloor={grant.awardFloor}
								awardCeiling={grant.awardCeiling}
								fundingAmount={grant.fundingAmount}
							/>
							{grant.deadline ? (
								<div className="text-sm text-muted-foreground">
									Deadline: {deadlineLabel}
								</div>
							) : null}
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{grant.reasons?.length ? (
						<div className="space-y-2 text-sm">
							<div className="flex items-center gap-2">
								<span className="text-muted-foreground">
									Why: {reasonPreview}
								</span>
								<button
									type="button"
									onClick={() => setShowReasons((prev) => !prev)}
									className="text-xs font-medium text-primary hover:underline"
								>
									{showReasons ? 'Hide' : 'Details'}
								</button>
							</div>
							{showReasons ? (
								<ul className="space-y-2">
									{grant.reasons.map((reason, index) => (
										<li key={`${reason.label}-${index}`} className="flex gap-2">
											<span className="mt-0.5">
												{reasonIcon(reason.strength)}
											</span>
											<div className="space-y-0.5">
												<div className="font-medium leading-tight">
													{reason.label}
												</div>
												{reason.detail ? (
													<div className="text-muted-foreground leading-tight">
														{reason.detail}
													</div>
												) : null}
											</div>
										</li>
									))}
								</ul>
							) : null}
							{summaryText ? (
								<p className="text-muted-foreground leading-relaxed">
									{summaryText}
								</p>
							) : null}
						</div>
					) : (
						<p className="text-muted-foreground text-sm leading-relaxed">
							{summaryText}
						</p>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
