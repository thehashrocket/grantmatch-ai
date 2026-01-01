import 'dotenv/config';

import { db } from '@/lib/db';
import { syncCaliforniaGrants } from '@/server/grants/syncCaliforniaGrants';

async function main() {
	const { runId } = await syncCaliforniaGrants({ driveTicks: true });
	const run = await db.grantSyncRun.findUnique({ where: { id: runId } });
	if (run) {
		console.log(
			JSON.stringify(
				{
					runId,
					status: run.status,
					fetched: run.recordsFetched,
					created: run.createdCount,
					updated: run.updatedCount,
					unchanged: run.unchangedCount,
					closed: run.closedCount,
					reopened: run.reopenedCount,
				},
				null,
				2,
			),
		);
	} else {
		console.log(`Import completed. runId=${runId}`);
	}
}

main()
	.catch((err) => {
		console.error('Failed to import grants:', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
