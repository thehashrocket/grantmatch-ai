'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { $Enums } from '@/prisma/generated/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

type ImportStatus = $Enums.ImportStatus;

type RunSummary = {
	id: string;
	status: ImportStatus;
	startedAt: Date;
	finishedAt: Date | null;
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
};

type GrantSyncPanelProps = {
	title: string;
	description: string;
	apiPath: string;
	statusBasePath?: string;
	scriptName: string;
	initialRun: RunSummary | null;
	startLabel?: string;
	busyLabel?: string;
};

const statusStyles: Record<
	ImportStatus,
	{ badge: string; label: string; text: string }
> = {
	QUEUED: {
		badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-200',
		label: 'Queued',
		text: 'Waiting to run',
	},
	IN_PROGRESS: {
		badge:
			'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-200',
		label: 'In progress',
		text: 'Run is active',
	},
	COMPLETED: {
		badge:
			'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200',
		label: 'Completed',
		text: 'Latest run finished',
	},
	FAILED: {
		badge:
			'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-200 border border-red-200 dark:border-red-800',
		label: 'Failed',
		text: 'Last run failed',
	},
};

export function GrantSyncPanel({
	title,
	description,
	apiPath,
	statusBasePath = '/api/admin/grants/runs',
	scriptName,
	initialRun,
	startLabel = 'Start sync',
	busyLabel = 'Syncing',
}: GrantSyncPanelProps) {
	const [runState, setRunState] = useState<RunSummary | null>(
		initialRun
			? {
					...initialRun,
					startedAt: new Date(initialRun.startedAt),
					finishedAt: initialRun.finishedAt
						? new Date(initialRun.finishedAt)
						: null,
				}
			: null,
	);
	const [isStarting, setIsStarting] = useState(false);

	useEffect(() => {
		if (!runState || runState.status !== 'IN_PROGRESS') return;

		const interval = setInterval(async () => {
			try {
				const response = await fetch(
					`${statusBasePath}/${encodeURIComponent(runState.id)}`,
				);
				if (!response.ok) return;
				const payload = (await response.json()) as RunSummary;
				setRunState({
					...payload,
					startedAt: new Date(payload.startedAt),
					finishedAt: payload.finishedAt ? new Date(payload.finishedAt) : null,
				});
				if (payload.status !== 'IN_PROGRESS') {
					clearInterval(interval);
				}
			} catch (err) {
				console.error('Failed to poll run status', err);
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [runState, statusBasePath]);

	const handleStart = async () => {
		setIsStarting(true);
		try {
			const response = await fetch(apiPath, { method: 'POST' });
			const payload = (await response.json()) as {
				error?: string;
				runId?: string;
			};

			if (!response.ok) {
				toast.error(payload.error ?? 'Failed to start run', {
					description: payload.runId ? `Run ID: ${payload.runId}` : undefined,
				});
				if (response.status === 409 && payload.runId) {
					setRunState(
						(current) =>
							current ?? {
								id: payload.runId as string,
								status: 'IN_PROGRESS',
								startedAt: new Date(),
								finishedAt: null,
								recordsFetched: 0,
								createdCount: 0,
								updatedCount: 0,
								unchangedCount: 0,
								closedCount: 0,
								reopenedCount: 0,
							},
					);
				}
				return;
			}

			if (!payload.runId) {
				toast.error('Run started but no run ID was returned.');
				return;
			}

			setRunState({
				id: payload.runId,
				status: 'IN_PROGRESS',
				startedAt: new Date(),
				finishedAt: null,
				recordsFetched: 0,
				createdCount: 0,
				updatedCount: 0,
				unchangedCount: 0,
				closedCount: 0,
				reopenedCount: 0,
			});

			toast.success(`${title} started`, {
				description: `Run ID: ${payload.runId}`,
			});
		} catch (error) {
			console.error('Failed to trigger run', error);
			toast.error('Unable to start run. Please try again.');
		} finally {
			setIsStarting(false);
		}
	};

	const status = runState?.status ?? 'QUEUED';
	const statusCopy = statusStyles[status];

	return (
		<Card>
			<CardHeader className="items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<CardTitle>{title}</CardTitle>
					<CardDescription>{description}</CardDescription>
				</div>
				<Button
					type="button"
					onClick={handleStart}
					disabled={isStarting || status === 'IN_PROGRESS'}
				>
					{isStarting ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							Starting…
						</>
					) : status === 'IN_PROGRESS' ? (
						<>
							<Loader2 className="h-4 w-4 animate-spin" />
							{busyLabel}
						</>
					) : (
						<>
							<RefreshCw className="h-4 w-4" />
							{startLabel}
						</>
					)}
				</Button>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap items-center gap-3">
					<span
						className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${statusCopy.badge}`}
					>
						{statusCopy.label}
					</span>
					{runState?.id ? (
						<span className="text-sm text-muted-foreground">
							Run ID: {runState.id}
						</span>
					) : (
						<span className="text-sm text-muted-foreground">
							No runs have been recorded yet.
						</span>
					)}
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="rounded-lg border bg-muted/50 p-4">
						<div className="text-xs uppercase tracking-wide text-muted-foreground">
							Status
						</div>
						<div className="text-sm font-medium">{statusCopy.text}</div>
						{runState?.startedAt && (
							<div className="text-sm text-muted-foreground">
								Started {formatDate(runState.startedAt)}
							</div>
						)}
						{runState?.finishedAt && (
							<div className="text-sm text-muted-foreground">
								Finished {formatDate(runState.finishedAt)}
							</div>
						)}
					</div>
					<div className="rounded-lg border bg-muted/50 p-4">
						<div className="text-xs uppercase tracking-wide text-muted-foreground">
							Counts
						</div>
						{runState ? (
							<div className="grid grid-cols-2 gap-2 text-sm">
								<Metric label="Fetched" value={runState.recordsFetched} />
								<Metric label="Created" value={runState.createdCount} />
								<Metric label="Updated" value={runState.updatedCount} />
								<Metric label="Unchanged" value={runState.unchangedCount} />
								<Metric label="Closed" value={runState.closedCount} />
								<Metric label="Reopened" value={runState.reopenedCount} />
							</div>
						) : (
							<div className="text-sm text-muted-foreground">
								Counts will appear once a run completes.
							</div>
						)}
					</div>
				</div>
				<p className="text-sm text-muted-foreground">
					Starting a run executes the same workflow as the CLI script{' '}
					<code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
						{scriptName}
					</code>{' '}
					and can take a few minutes. Refresh this page to see the latest status
					after completion.
				</p>
			</CardContent>
		</Card>
	);
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-md bg-background px-3 py-2 shadow-xs">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-sm font-semibold">{value}</div>
		</div>
	);
}

function formatDate(date: Date) {
	return new Intl.DateTimeFormat('en', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	}).format(date);
}
