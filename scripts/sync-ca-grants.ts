import 'dotenv/config';

import { db } from '@/lib/db';
import { syncCaliforniaGrants } from '@/server/grants/syncCaliforniaGrants';

async function main() {
  const { runId } = await syncCaliforniaGrants();
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
        2
      )
    );
  } else {
    console.log(`Run completed. runId=${runId}`);
  }
}

main()
  .catch((err) => {
    console.error('Sync failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
