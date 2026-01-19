// /src/components/profile/organization-match-form.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Loader2 } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import type { $Enums } from '@/prisma/generated/client';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookmarkTagsInput } from '@/components/grants/BookmarkTagsInput';

type Option<T extends string> = { value: T; label: string };

const entityTypeOptions: Option<$Enums.OrganizationEntityType>[] = [
	{ value: 'NONPROFIT_501C3', label: 'Nonprofit (501(c)(3))' },
	{ value: 'NONPROFIT_OTHER', label: 'Nonprofit (other)' },
	{ value: 'FISCAL_SPONSOR', label: 'Fiscal sponsor' },
	{ value: 'GOVERNMENT', label: 'Government' },
	{ value: 'TRIBE', label: 'Tribe' },
	{ value: 'SCHOOL', label: 'School' },
	{ value: 'FOR_PROFIT', label: 'For-profit' },
	{ value: 'INDIVIDUAL', label: 'Individual' },
	{ value: 'OTHER', label: 'Other' },
];

const revenueSourceOptions: Option<$Enums.RevenueSource>[] = [
	{ value: 'DONATIONS', label: 'Individual donations' },
	{ value: 'GRANTS', label: 'Grants' },
	{ value: 'GOV_CONTRACTS', label: 'Government contracts' },
	{ value: 'PROGRAM_FEES', label: 'Program fees' },
	{ value: 'MEMBERSHIPS', label: 'Memberships' },
	{ value: 'CORPORATE_SPONSORS', label: 'Corporate sponsors' },
	{ value: 'OTHER', label: 'Other' },
];

const budgetRangeOptions: Option<$Enums.BudgetRange>[] = [
	{ value: 'LT_50K', label: 'Under $50K' },
	{ value: 'FROM_50K_TO_250K', label: '$50K - $250K' },
	{ value: 'FROM_250K_TO_1M', label: '$250K - $1M' },
	{ value: 'FROM_1M_TO_5M', label: '$1M - $5M' },
	{ value: 'OVER_5M', label: '$5M+' },
];

const staffRangeOptions: Option<$Enums.StaffRange>[] = [
	{ value: 'ZERO', label: '0 staff' },
	{ value: 'ONE_TO_FIVE', label: '1 - 5' },
	{ value: 'SIX_TO_TWENTY', label: '6 - 20' },
	{ value: 'TWENTY_ONE_TO_ONE_HUNDRED', label: '21 - 100' },
	{ value: 'OVER_ONE_HUNDRED', label: '100+' },
];

const ENTITY_CLEAR_VALUE = 'NONE';
const BUDGET_CLEAR_VALUE = 'NONE';
const STAFF_CLEAR_VALUE = 'NONE';

const formatAgo = (ts: Date | string | null | undefined, nowMs: number) => {
	if (!ts) return null;
	const t = typeof ts === 'string' ? new Date(ts).getTime() : ts.getTime();
	if (Number.isNaN(t)) return null;
	const deltaSec = Math.max(0, Math.floor((nowMs - t) / 1000));
	if (deltaSec < 60) return `${deltaSec}s ago`;
	const deltaMin = Math.floor(deltaSec / 60);
	if (deltaMin < 60) return `${deltaMin}m ago`;
	const deltaHr = Math.floor(deltaMin / 60);
	return `${deltaHr}h ago`;
};

export function OrganizationMatchForm() {
	const { data, isLoading, isError, refetch, error } =
		trpc.organization.getProfile.useQuery();
	const indexStatusQuery = trpc.organization.getIndexStatus.useQuery(
		undefined,
		{
			refetchOnWindowFocus: false,
		},
	);
	const mutation = trpc.organization.updateProfile.useMutation();
	const kickMutation = trpc.organization.kickMatchRecompute.useMutation();
	const tickMutation = trpc.organization.tickMatchIndex.useMutation();
	const utils = trpc.useUtils();
	const pollCancelRef = useRef(false);
	const inProgressRef = useRef(false);
	const tickInFlightRef = useRef(false);
	const mountedToastShownRef = useRef(false);
	const [now, setNow] = useState(() => Date.now());

	const [entityType, setEntityType] =
		useState<$Enums.OrganizationEntityType | null>(null);
	const [revenueSources, setRevenueSources] = useState<$Enums.RevenueSource[]>(
		[],
	);
	const [budgetRange, setBudgetRange] = useState<$Enums.BudgetRange | null>(
		null,
	);
	const [staffRange, setStaffRange] = useState<$Enums.StaffRange | null>(null);
	const [focusAreas, setFocusAreas] = useState<string[]>([]);
	const [serviceAreas, setServiceAreas] = useState<string[]>([]);
	const [priorityFocusKeywords, setPriorityFocusKeywords] = useState<string[]>(
		[],
	);

	const resolvedEntityType = useMemo(
		() => entityType ?? data?.entityType ?? null,
		[data?.entityType, entityType],
	);
	const resolvedBudgetRange = useMemo(
		() => budgetRange ?? data?.budgetRange ?? null,
		[data?.budgetRange, budgetRange],
	);
	const resolvedStaffRange = useMemo(
		() => staffRange ?? data?.staffRange ?? null,
		[data?.staffRange, staffRange],
	);

	const selectedEntityLabel = useMemo(
		() =>
			entityTypeOptions.find((option) => option.value === entityType)?.label ??
			entityTypeOptions.find((option) => option.value === data?.entityType)
				?.label ??
			undefined,
		[data?.entityType, entityType],
	);

	const selectedBudgetLabel = useMemo(
		() =>
			budgetRangeOptions.find((option) => option.value === budgetRange)
				?.label ??
			budgetRangeOptions.find((option) => option.value === data?.budgetRange)
				?.label ??
			undefined,
		[budgetRange, data?.budgetRange],
	);

	const selectedStaffLabel = useMemo(
		() =>
			staffRangeOptions.find((option) => option.value === staffRange)?.label ??
			staffRangeOptions.find((option) => option.value === data?.staffRange)
				?.label ??
			undefined,
		[data?.staffRange, staffRange],
	);

	useEffect(() => {
		if (!data) return;
		setEntityType(data.entityType ?? null);
		setRevenueSources(data.revenueSources ?? []);
		setBudgetRange(data.budgetRange ?? null);
		setStaffRange(data.staffRange ?? null);
		setFocusAreas(data.focusAreas ?? []);
		setServiceAreas(data.serviceAreas ?? []);
		setPriorityFocusKeywords(data.priorityFocusKeywords ?? []);
	}, [data]);

	const selectedRevenueSources = useMemo(
		() =>
			revenueSourceOptions.filter((option) =>
				revenueSources.includes(option.value),
			),
		[revenueSources],
	);

	const toggleRevenueSource = (value: string) => {
		setRevenueSources((current) =>
			current.includes(value as $Enums.RevenueSource)
				? current.filter((item) => item !== value)
				: [...current, value as $Enums.RevenueSource],
		);
	};

	useEffect(() => {
		return () => {
			pollCancelRef.current = true;
		};
	}, []);

	useEffect(() => {
		if (
			!mountedToastShownRef.current &&
			indexStatusQuery.data?.matchIndexStatus === 'RUNNING'
		) {
			toast.message('Grant rankings are updating in the background.');
			mountedToastShownRef.current = true;
		}
	}, [indexStatusQuery.data?.matchIndexStatus]);

	useEffect(() => {
		const status =
			indexStatusQuery.data?.matchIndexStatus ?? data?.matchIndexStatus;
		if (status !== 'RUNNING') return;
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, [data?.matchIndexStatus, indexStatusQuery.data?.matchIndexStatus]);

	useEffect(() => {
		const status =
			indexStatusQuery.data?.matchIndexStatus ?? data?.matchIndexStatus;
		if (status !== 'RUNNING') return;

		let cancelled = false;
		const interval = setInterval(async () => {
			if (cancelled) return;
			if (tickInFlightRef.current) return;
			tickInFlightRef.current = true;
			try {
				await tickMutation.mutateAsync();
				await indexStatusQuery.refetch();
			} catch (tickError) {
				console.error('Match index tick failed', tickError);
			} finally {
				tickInFlightRef.current = false;
			}
		}, 5000);

		return () => {
			cancelled = true;
			clearInterval(interval);
		};
	}, [data?.matchIndexStatus, indexStatusQuery, tickMutation]);

	const pollIndexStatus = async () => {
		pollCancelRef.current = false;
		const start = Date.now();
		const POLL_MS = 2000;
		const POLL_MAX_MS = 60000;
		let lastStatus: Awaited<
			ReturnType<typeof utils.organization.getIndexStatus.fetch>
		> | null = null;

		while (Date.now() - start < POLL_MAX_MS) {
			if (pollCancelRef.current) return { outcome: 'CANCELLED' as const };

			try {
				await tickMutation.mutateAsync();
			} catch (tickError) {
				console.error('Match index tick failed', tickError);
			}

			const status = await utils.organization.getIndexStatus.fetch();
			utils.organization.getIndexStatus.setData(undefined, status);
			lastStatus = status;
			if (status.matchIndexStatus === 'COMPLETE') {
				return { outcome: 'COMPLETE' as const, status: lastStatus };
			}
			if (status.matchIndexStatus === 'FAILED') {
				return { outcome: 'FAILED' as const, status: lastStatus };
			}
			await new Promise((resolve) => setTimeout(resolve, POLL_MS));
		}
		return { outcome: 'TIMEOUT' as const, status: lastStatus };
	};

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		try {
			const result = await mutation.mutateAsync({
				entityType,
				revenueSources,
				budgetRange,
				staffRange,
				focusAreas,
				serviceAreas,
				priorityFocusKeywords,
			});

			toast.success('Organization profile updated');
			void refetch();

			if (result?.didTriggerRescore) {
				inProgressRef.current = true;
				const loadingId = toast.loading('Updating grant rankings…', {
					description:
						'We’re refreshing rankings in the background. This may take a moment.',
				});

				try {
					await kickMutation.mutateAsync();
					const { outcome, status } = await pollIndexStatus();

					if (outcome === 'COMPLETE') {
						await Promise.all([
							utils.organization.getProfile.invalidate(),
							utils.organization.getIndexStatus.invalidate(),
						]);
						toast.success('Grant rankings updated', {
							id: loadingId,
							action: {
								label: 'Refresh',
								onClick: async () => {
									await Promise.all([
										utils.organization.getProfile.invalidate(),
										utils.organization.getIndexStatus.invalidate(),
									]);
								},
							},
						});
						return;
					}

					if (outcome === 'FAILED') {
						const description =
							status?.matchIndexError?.toString().slice(0, 120) ??
							'Re-ranking failed';
						toast.error('Grant re-ranking failed', {
							id: loadingId,
							description,
							action: {
								label: 'Retry',
								onClick: () => {
									void kickMutation.mutateAsync().catch((err) => {
										console.error('Retry kick failed', err);
									});
								},
							},
						});
						return;
					}

					toast.message(
						'Grant re-ranking is still running in the background.',
						{
							id: loadingId,
							action: {
								label: 'Refresh status',
								onClick: async () => {
									await tickMutation.mutateAsync();
									await indexStatusQuery.refetch();
								},
							},
						},
					);
				} catch (rescoreError) {
					toast.error(
						rescoreError instanceof Error
							? rescoreError.message
							: 'Failed to kick off re-ranking',
						{ id: loadingId },
					);
				} finally {
					inProgressRef.current = false;
				}
			}
		} catch (mutationError) {
			toast.error(
				mutationError instanceof Error
					? mutationError.message
					: 'Failed to save profile',
			);
		} finally {
			inProgressRef.current = false;
		}
	};

	const matchStatusText = useMemo(() => {
		const source =
			indexStatusQuery.data ??
			({
				matchIndexStatus: data?.matchIndexStatus,
				matchIndexedCount: data?.matchIndexedCount,
				matchIndexError: data?.matchIndexError,
				eligibleGrantCount: undefined,
				matchIndexLastTickAt: data?.matchIndexLastTickAt ?? null,
			} as const);
		if (!source?.matchIndexStatus) return null;
		const count = source.matchIndexedCount ?? 0;
		const eligible = source.eligibleGrantCount;
		const suffix =
			eligible && eligible > 0
				? ` (${count} / ${eligible} processed)`
				: count
					? ` (${count} processed)`
					: '';
		return `Ranking status: ${source.matchIndexStatus}${suffix}`;
	}, [
		data?.matchIndexStatus,
		data?.matchIndexedCount,
		data?.matchIndexError,
		indexStatusQuery.data?.matchIndexStatus,
		indexStatusQuery.data?.matchIndexedCount,
		indexStatusQuery.data?.matchIndexError,
		indexStatusQuery.data?.eligibleGrantCount,
		indexStatusQuery.data,
		data,
	]);
	const statusSource = (indexStatusQuery.data ?? data ?? {}) as {
		matchIndexStatus?: string | null;
		matchIndexedCount?: number | null;
		matchIndexError?: string | null;
		eligibleGrantCount?: number | null;
		matchIndexLastTickAt?: Date | string | null;
		matchIndexLastTickIndexedDelta?: number | null;
		matchIndexLastTickRecomputedDelta?: number | null;
	};
	const lastUpdateText = useMemo(
		() => formatAgo(statusSource.matchIndexLastTickAt ?? null, now),
		[statusSource.matchIndexLastTickAt, now],
	);

	return (
		<Card>
			<CardHeader className="border-b">
				<div className="flex items-start gap-3">
					<div className="rounded-full bg-primary/10 p-2 text-primary">
						<Sparkles className="h-5 w-5" />
					</div>
					<div className="space-y-1">
						<CardTitle>Improve matches</CardTitle>
						<CardDescription>
							Add quick profile signals to tailor eligibility, geography, and
							purpose scoring for your organization.
						</CardDescription>
					</div>
				</div>
			</CardHeader>
			<CardContent className="pt-6">
				{isLoading ? (
					<div className="flex items-center gap-2 text-muted-foreground">
						<Loader2 className="h-4 w-4 animate-spin" />
						<span>Loading organization profile…</span>
					</div>
				) : isError ? (
					<div className="text-sm text-destructive">
						{error?.message ?? 'Unable to load organization profile.'}
					</div>
				) : (
					<form className="space-y-6" onSubmit={handleSubmit}>
						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Entity type</Label>
								<Select
									value={resolvedEntityType ?? ENTITY_CLEAR_VALUE}
									onValueChange={(value) =>
										value === ENTITY_CLEAR_VALUE
											? setEntityType(null)
											: setEntityType(value as $Enums.OrganizationEntityType)
									}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={selectedEntityLabel ?? 'Select entity type'}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={ENTITY_CLEAR_VALUE}>
											No selection
										</SelectItem>
										{entityTypeOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Used to boost eligibility when grants explicitly call out
									501(c)(3) or similar organizations.
								</p>
							</div>
							<div className="space-y-2">
								<Label>Revenue sources</Label>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button
											type="button"
											variant="outline"
											className="w-full justify-between"
										>
											<span>
												{selectedRevenueSources.length > 0
													? `${selectedRevenueSources.length} selected`
													: 'Select revenue sources'}
											</span>
											<span className="text-xs text-muted-foreground">
												Multi-select
											</span>
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent className="w-full min-w-64">
										{revenueSourceOptions.map((option) => (
											<DropdownMenuCheckboxItem
												key={option.value}
												checked={revenueSources.includes(option.value)}
												onCheckedChange={() =>
													toggleRevenueSource(option.value)
												}
											>
												{option.label}
											</DropdownMenuCheckboxItem>
										))}
									</DropdownMenuContent>
								</DropdownMenu>
								<div className="flex flex-wrap gap-2">
									{selectedRevenueSources.map((option) => (
										<Badge key={option.value} variant="secondary">
											{option.label}
										</Badge>
									))}
									{selectedRevenueSources.length === 0 && (
										<span className="text-sm text-muted-foreground">
											No revenue sources added
										</span>
									)}
								</div>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Budget range</Label>
								<Select
									value={resolvedBudgetRange ?? BUDGET_CLEAR_VALUE}
									onValueChange={(value) =>
										value === BUDGET_CLEAR_VALUE
											? setBudgetRange(null)
											: setBudgetRange(value as $Enums.BudgetRange)
									}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={selectedBudgetLabel ?? 'Select range'}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={BUDGET_CLEAR_VALUE}>
											No selection
										</SelectItem>
										{budgetRangeOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Helps align funding amounts to a reasonable slice of your
									annual budget.
								</p>
							</div>
							<div className="space-y-2">
								<Label>Team size</Label>
								<Select
									value={resolvedStaffRange ?? STAFF_CLEAR_VALUE}
									onValueChange={(value) =>
										value === STAFF_CLEAR_VALUE
											? setStaffRange(null)
											: setStaffRange(value as $Enums.StaffRange)
									}
								>
									<SelectTrigger>
										<SelectValue
											placeholder={selectedStaffLabel ?? 'Select staff range'}
										/>
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={STAFF_CLEAR_VALUE}>
											No selection
										</SelectItem>
										{staffRangeOptions.map((option) => (
											<SelectItem key={option.value} value={option.value}>
												{option.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<p className="text-sm text-muted-foreground">
									Optional signal for reviewers; does not affect scoring yet.
								</p>
							</div>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label>Focus areas</Label>
								<BookmarkTagsInput
									tags={focusAreas}
									onChange={setFocusAreas}
									disabled={mutation.isPending}
								/>
								<p className="text-sm text-muted-foreground">
									Add topics like &quot;affordable housing&quot; or &quot;youth
									services&quot; to improve purpose matching.
								</p>
							</div>
							<div className="space-y-2">
								<Label>Priority focus (top 5)</Label>
								<BookmarkTagsInput
									tags={priorityFocusKeywords}
									onChange={setPriorityFocusKeywords}
									disabled={mutation.isPending}
									maxTags={5}
								/>
								<p className="text-sm text-muted-foreground">
									These keywords are weighted higher for purpose matching. Keep
									it to your top 5 priorities.
								</p>
							</div>
							<div className="space-y-2">
								<Label>Service areas</Label>
								<BookmarkTagsInput
									tags={serviceAreas}
									onChange={setServiceAreas}
									disabled={mutation.isPending}
								/>
								<p className="text-sm text-muted-foreground">
									List cities, counties, or regions (e.g.,
									&quot;california&quot;, &quot;san joaquin&quot;,
									&quot;nationwide&quot;).
								</p>
							</div>
						</div>

						<div className="flex justify-end">
							<Button
								type="submit"
								disabled={mutation.isPending || inProgressRef.current}
							>
								{mutation.isPending && (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								)}
								Save match profile
							</Button>
							{matchStatusText && (
								<div className="ml-4 text-sm text-muted-foreground space-y-1">
									<div className="flex items-center gap-2">
										<span>{matchStatusText}</span>
										{lastUpdateText ? (
											<span className="text-xs text-muted-foreground">
												• Last update: {lastUpdateText}
											</span>
										) : null}
										{statusSource.matchIndexLastTickIndexedDelta !==
											undefined && (
											<span className="text-xs text-muted-foreground">
												• Last tick: +
												{statusSource.matchIndexLastTickIndexedDelta ?? 0}{' '}
												scanned, +
												{statusSource.matchIndexLastTickRecomputedDelta ?? 0}{' '}
												updated
											</span>
										)}
										<button
											type="button"
											className="underline hover:text-primary"
											onClick={async () => {
												await tickMutation.mutateAsync();
												await indexStatusQuery.refetch();
											}}
											disabled={inProgressRef.current}
										>
											Refresh
										</button>
									</div>
									{statusSource?.matchIndexStatus === 'RUNNING' &&
										statusSource?.eligibleGrantCount && (
											<div className="text-xs text-muted-foreground">
												This may take a minute. You can leave this page and come
												back.
											</div>
										)}
								</div>
							)}
						</div>
					</form>
				)}
			</CardContent>
		</Card>
	);
}
