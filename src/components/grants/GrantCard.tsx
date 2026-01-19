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
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import {
	getFitScoreCategory,
	getFitScoreColor,
	type GrantMatch,
} from '@/lib/types/grant';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { getFlagInfo } from '@/lib/utils/flag-utils';
import Image from 'next/image';
import DetailsStatusBadge from '@/components/grants/DetailsStatusBadge';
import { FundingAmount } from '@/components/grants/FundingAmount';
import { applyReturnTo } from '@/lib/utils/return-to';
import { parseSubscoresJson } from '@/lib/utils/match-explanation';
import { cn } from '@/lib/utils';
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from '@/components/ui/tooltip';

interface GrantCardProps {
	grant: GrantMatch;
	actionSlot?: React.ReactNode;
	returnTo?: string;
	returnQuery?: string;
	summaryTags?: string[];
}

function formatDate(dateString: string): string {
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

export function GrantCard({
	grant,
	actionSlot,
	returnTo,
	returnQuery,
	summaryTags,
}: GrantCardProps) {
	const category = getFitScoreCategory(grant.fitScore);
	const colorClasses = getFitScoreColor(category);
	const flagInfo = getFlagInfo(grant.source);
	const parsed = parseSubscoresJson(grant.subscoresJson ?? grant.subscores);
	const fallbackSubscores =
		grant.subscores &&
		typeof grant.subscores === 'object' &&
		!Array.isArray(grant.subscores)
			? (grant.subscores as Record<string, number>)
			: null;
	const subscores =
		parsed && Object.keys(parsed.subscores).length > 0
			? parsed.subscores
			: fallbackSubscores;
	const reasons =
		parsed?.reasons ?? (grant.reasons ? grant.reasons.slice(0, 4) : []);
	const rawConfidence = parsed?.confidence;
	const confidence =
		rawConfidence === 'HIGH' ||
		rawConfidence === 'MED' ||
		rawConfidence === 'LOW'
			? rawConfidence
			: undefined;
	const missingSignals = parsed?.missing ?? grant.missing ?? [];
	const matches = parsed?.matches ?? grant.matches;
	const hasStructured = Boolean(parsed) || reasons.length > 0;
	const summaryText = hasStructured
		? null
		: (grant.scoreSummary ?? grant.explanation);
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
	const confidenceClass = confidence
		? confidence === 'HIGH'
			? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
			: confidence === 'LOW'
				? 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
				: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
		: '';
	const confidenceLabel = confidence
		? confidence === 'MED'
			? 'Med'
			: confidence.charAt(0) + confidence.slice(1).toLowerCase()
		: '';
	const reasonTone = (strength: string) => {
		switch (strength) {
			case 'strong':
				return 'bg-emerald-50 text-emerald-800 border-emerald-200';
			case 'medium':
				return 'bg-blue-50 text-blue-800 border-blue-200';
			case 'weak':
				return 'bg-amber-50 text-amber-800 border-amber-200';
			default:
				return 'bg-slate-50 text-slate-800 border-slate-200';
		}
	};

	const missingLabels: Record<string, string> = {
		PURPOSE: 'Purpose',
		APPLICANTS: 'Eligible applicants',
		GEOGRAPHY: 'Geography',
		FUNDING: 'Funding amount',
	};

	const subscoreEntries: Array<{
		key: keyof NonNullable<typeof subscores>;
		label: string;
		value: number | undefined;
	}> = [
		{ key: 'purpose', label: 'Purpose', value: subscores?.purpose },
		{
			key: 'eligibility',
			label: 'Eligibility',
			value: subscores?.eligibility,
		},
		{ key: 'geography', label: 'Geography', value: subscores?.geography },
		{ key: 'funding', label: 'Funding', value: subscores?.funding },
	];

	const detailHref = returnQuery
		? `${grant.internalUrl}${grant.internalUrl.includes('?') ? '&' : '?'}${returnQuery}`
		: grant.internalUrl;
	const grantHref = applyReturnTo(detailHref, returnTo);
	const trimmedTags = summaryTags?.filter(Boolean) ?? [];
	const visibleTags = trimmedTags.slice(0, 2);
	const extraTagCount =
		trimmedTags.length > visibleTags.length
			? trimmedTags.length - visibleTags.length
			: 0;

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
										className="h-auto w-5"
									/>
								)}
								<Link href={grantHref} className="hover:underline line-clamp-2">
									{grant.title}
								</Link>
							</CardTitle>
							<CardDescription className="flex flex-wrap items-center gap-2">
								<Badge className={colorClasses}>
									{fitLabel} • {grant.fitScore.toFixed(1)}/10
								</Badge>
								{visibleTags.map((tag) => (
									<Badge key={tag} variant="secondary">
										{tag}
									</Badge>
								))}
								{extraTagCount > 0 ? (
									<Badge variant="outline">+{extraTagCount} more</Badge>
								) : null}
								{confidence ? (
									<Tooltip>
										<TooltipTrigger asChild>
											<Badge className={confidenceClass}>
												Confidence: {confidenceLabel}
											</Badge>
										</TooltipTrigger>
										<TooltipContent align="start" className="max-w-xs text-xs">
											Confidence is lower when grants omit eligibility,
											geography, purpose, or funding details.
										</TooltipContent>
									</Tooltip>
								) : null}
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
					{hasStructured ? (
						<div className="space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								{reasons.slice(0, 4).map((reason, index) => (
									<Badge
										key={`${reason.label}-${index}`}
										variant="outline"
										className={cn(
											'flex items-center gap-1 border',
											reasonTone(reason.strength),
										)}
									>
										<span>
											{reason.label}
											{reason.detail ? `: ${reason.detail}` : ''}
										</span>
									</Badge>
								))}
							</div>
							<div className="flex items-center gap-3 text-sm">
								<Popover>
									<PopoverTrigger asChild>
										<button
											type="button"
											className="text-primary hover:underline font-medium text-xs"
										>
											Why this match?
										</button>
									</PopoverTrigger>
									<PopoverContent align="start">
										<div className="space-y-3">
											<div className="flex items-center gap-2 text-sm font-medium">
												<span>Fit score: {grant.fitScore.toFixed(1)}/10</span>
												{confidence ? (
													<Badge className={confidenceClass}>
														Confidence: {confidenceLabel}
													</Badge>
												) : null}
											</div>
											<div className="space-y-1">
												<p className="text-sm font-medium">Match breakdown</p>
												<p className="text-xs text-muted-foreground leading-snug">
													{grant.explanation}
												</p>
											</div>
											<div className="grid grid-cols-2 gap-3">
												{subscoreEntries.map((entry) => (
													<div key={entry.key} className="space-y-1">
														<div className="flex items-center justify-between text-xs font-medium">
															<span>{entry.label}</span>
															<span className="text-muted-foreground">
																{typeof entry.value === 'number'
																	? `${Math.round(entry.value * 100)}%`
																	: '—'}
															</span>
														</div>
														<Progress
															value={
																typeof entry.value === 'number'
																	? entry.value * 100
																	: 0
															}
														/>
													</div>
												))}
											</div>
											{matches?.amountInRange === false ? (
												<div className="flex items-center gap-2 text-xs text-amber-700">
													<AlertTriangle className="h-4 w-4" />
													<span>
														Funding may sit outside your preferred range.
													</span>
												</div>
											) : null}
											{missingSignals.length > 0 ? (
												<div className="space-y-1">
													<p className="text-xs font-medium">Missing signals</p>
													<div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
														{missingSignals.map((signal) => (
															<span
																key={signal}
																className="rounded-full bg-muted px-2 py-0.5"
															>
																{missingLabels[signal] ?? signal.toLowerCase()}
															</span>
														))}
													</div>
												</div>
											) : null}
										</div>
									</PopoverContent>
								</Popover>
							</div>
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
