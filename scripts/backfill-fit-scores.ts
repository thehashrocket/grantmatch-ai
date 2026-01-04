import 'dotenv/config';

import { db } from '@/lib/db';
import {
	calculateGrantFitScore,
	FIT_SCORE_VERSION,
} from '@/lib/utils/grant-scoring';

const BATCH_SIZE = 200;

async function backfillFitScores() {
	let processed = 0;
	let updated = 0;

	// eslint-disable-next-line no-constant-condition
	while (true) {
		const grants = await db.grant.findMany({
			where: {
				OR: [
					{ fitScore: null },
					{ fitScoreVersion: { lt: FIT_SCORE_VERSION } },
				],
			},
			take: BATCH_SIZE,
		});

		if (grants.length === 0) {
			break;
		}

		for (const grant of grants) {
			const fitScore = calculateGrantFitScore({
				estimatedTotalFunding: grant.estimatedTotalFunding ?? null,
				eligibleApplicants: grant.eligibleApplicants ?? null,
				eligibleGeographies: grant.eligibleGeographies ?? null,
				purpose: grant.purpose ?? null,
			});

			await db.grant.update({
				where: { id: grant.id },
				data: {
					fitScore,
					fitScoreVersion: FIT_SCORE_VERSION,
					fitScoreComputedAt: new Date(),
				},
			});
			updated++;
		}

		processed += grants.length;
		console.log(`Processed ${processed} grants; updated ${updated} so far...`);
	}

	console.log(`Backfill complete. Updated ${updated} grants.`);
}

backfillFitScores()
	.catch((err) => {
		console.error('Failed to backfill fit scores:', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		await db.$disconnect();
	});
