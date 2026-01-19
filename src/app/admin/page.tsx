import Link from 'next/link';
import { GrantSyncPanel } from '@/components/admin/grant-sync-panel';
import { db } from '@/lib/db';
import { $Enums } from '@/prisma/generated/client';
import { FitScoreBackfill } from '@/components/admin/fit-score-backfill';
import { Button } from '@/components/ui/button';

export default async function AdminPage() {
	const [latestFederalRun, latestCaliforniaRun] = await Promise.all([
		db.grantSyncRun.findFirst({
			where: { source: $Enums.GrantSource.FEDERAL },
			orderBy: { startedAt: 'desc' },
			select: {
				id: true,
				status: true,
				startedAt: true,
				finishedAt: true,
				recordsFetched: true,
				createdCount: true,
				updatedCount: true,
				unchangedCount: true,
				closedCount: true,
				reopenedCount: true,
			},
		}),
		db.grantSyncRun.findFirst({
			where: { source: $Enums.GrantSource.CALIFORNIA },
			orderBy: { startedAt: 'desc' },
			select: {
				id: true,
				status: true,
				startedAt: true,
				finishedAt: true,
				recordsFetched: true,
				createdCount: true,
				updatedCount: true,
				unchangedCount: true,
				closedCount: true,
				reopenedCount: true,
			},
		}),
	]);

	return (
		<div className="container mx-auto space-y-4">
			<div className="space-y-1">
				<h1 className="text-3xl font-semibold">Admin Controls</h1>
				<p className="text-sm text-muted-foreground">
					Manage data syncs and operational tasks. Only admins can access this
					area.
				</p>
			</div>

			<div className="space-y-4">
				<div className="rounded-lg border border-border bg-background p-4">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-lg font-semibold">User directory</h2>
							<p className="text-sm text-muted-foreground">
								View users, organizations, and bookmark counts.
							</p>
						</div>
						<Button asChild variant="outline" size="sm">
							<Link href="/admin/users">View users</Link>
						</Button>
					</div>
				</div>

				<GrantSyncPanel
					title="Federal grants sync"
					description="Run the ingestion that powers federal grant listings and details."
					apiPath="/api/admin/grants/sync/federal"
					scriptName="scripts/sync-federal-grants.ts"
					initialRun={latestFederalRun}
					startLabel="Start sync"
					busyLabel="Syncing"
				/>

				<FitScoreBackfill />

				<GrantSyncPanel
					title="California grants import"
					description="Import the California CSV to refresh state grant listings."
					apiPath="/api/admin/grants/import/california"
					scriptName="scripts/import-california-grants.ts"
					initialRun={latestCaliforniaRun}
					startLabel="Start import"
					busyLabel="Importing"
				/>
			</div>
		</div>
	);
}
