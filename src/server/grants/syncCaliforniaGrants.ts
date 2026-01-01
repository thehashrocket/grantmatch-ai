import { db } from '@/lib/db';
import { runTick, startTickIngest } from '@/server/grants/ingest/tickIngest';
import { caCkanAdapter } from '@/server/grants/sources/caCkanAdapter';

export async function syncCaliforniaGrants(options?: {
	driveTicks?: boolean;
	staleAfterSeconds?: number;
}) {
	const { runId } = await startTickIngest(db, caCkanAdapter);
	if (!options?.driveTicks) return { runId };

	let attempts = 0;
	while (attempts < 10_000) {
		const tick = await runTick(db, runId, options?.staleAfterSeconds ?? 30);
		attempts += 1;

		if (!tick.claimed) {
			const reason =
				tick.claim && 'reason' in tick.claim ? tick.claim.reason : undefined;
			if (
				reason === 'NOT_FOUND' ||
				reason === 'NOT_IN_PROGRESS'
			) {
				break;
			}
			await wait(200);
			continue;
		}

		if (tick.result?.committed && tick.result.run.status !== 'IN_PROGRESS') {
			break;
		}
		await wait(50);
	}

	return { runId };
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
