'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface BackfillResult {
	processed: number;
	updated: number;
	remaining: number;
	hasMore: boolean;
	durationMs: number;
	error?: string;
	code?: string;
}

export function FitScoreBackfill() {
	const [isRunning, setIsRunning] = useState(false);
	const [result, setResult] = useState<BackfillResult | null>(null);

	const handleRun = async () => {
		setIsRunning(true);
		setResult(null);
		try {
			const res = await fetch('/api/admin/grants/fit-score/backfill', {
				method: 'POST',
			});
			const payload = (await res.json()) as BackfillResult;

			if (!res.ok) {
				toast.error(payload.error ?? 'Failed to populate fit scores');
				setResult(payload);
				return;
			}

			toast.success('Fit scores populated', {
				description: payload.hasMore
					? 'Processed batch; more remaining. Run again to continue.'
					: 'All missing scores populated.',
			});
			setResult(payload);
		} catch (error) {
			console.error('Backfill failed', error);
			toast.error('Unable to populate fit scores');
			setResult({
				processed: 0,
				updated: 0,
				remaining: 0,
				hasMore: true,
				durationMs: 0,
				error: 'REQUEST_FAILED',
			});
		} finally {
			setIsRunning(false);
		}
	};

	const statusBadge = result ? (
		<Badge variant="secondary">
			{result.hasMore ? 'Partial run - run again' : 'Completed batch'}
		</Badge>
	) : null;

	return (
		<Card>
			<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-1">
					<CardTitle className="flex items-center gap-2">
						<Sparkles className="h-5 w-5 text-primary" />
						Populate fit scores
					</CardTitle>
					<CardDescription>
						Backfill or refresh stored fitScore values for grants missing the
						current version. Runs in batches; you can re-run until remaining is
						0.
					</CardDescription>
				</div>
				<Button onClick={handleRun} disabled={isRunning} type="button">
					{isRunning ? (
						<>
							<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							Populating…
						</>
					) : (
						<>
							<Sparkles className="mr-2 h-4 w-4" />
							Populate fit scores
						</>
					)}
				</Button>
			</CardHeader>
			<CardContent className="space-y-3">
				{statusBadge}
				{result ? (
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
						<Metric label="Processed" value={result.processed} />
						<Metric label="Updated" value={result.updated} />
						<Metric label="Remaining" value={result.remaining} />
						<Metric
							label="Duration"
							value={`${Math.round(result.durationMs / 1000)}s`}
						/>
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						Runs will process grants missing a fitScore or with an out-of-date
						version. Each click runs a batch within a 4-minute time budget.
					</p>
				)}
			</CardContent>
		</Card>
	);
}

function Metric({ label, value }: { label: string; value: number | string }) {
	return (
		<div className="rounded-md border bg-muted/40 px-3 py-2">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-sm font-semibold">{value}</div>
		</div>
	);
}
