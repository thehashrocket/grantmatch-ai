import { GrantSyncPanel } from '@/components/admin/grant-sync-panel';
import { db } from '@/lib/db';
import { $Enums } from '@/prisma/generated/client';

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
				<GrantSyncPanel
					title="Federal grants sync"
					description="Run the ingestion that powers federal grant listings and details."
					apiPath="/api/admin/grants/sync/federal"
					scriptName="scripts/sync-federal-grants.ts"
					initialRun={latestFederalRun}
					startLabel="Start sync"
					busyLabel="Syncing"
				/>

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
