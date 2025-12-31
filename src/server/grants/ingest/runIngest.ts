import { db } from '@/lib/db';
import { upsertGrantFromNormalized } from '@/server/grants/ingest/upsertGrant';
import type {
	GrantSourceAdapter,
	NormalizedGrantInput,
	RunCounters,
} from '@/server/grants/ingest/types';
import { Prisma, $Enums } from '@/prisma/generated/client';
import { MAX_TICK_ERRORS, normalizedGrantSchema } from './validation';

const CONCURRENCY = 15;
const MAX_ERRORS = MAX_TICK_ERRORS;

export async function runIngest(
	adapter: GrantSourceAdapter,
	options?: { fireAndForget?: boolean },
): Promise<{ runId: string }> {
	const runCounters: RunCounters = {
		recordsFetched: 0,
		createdCount: 0,
		updatedCount: 0,
		unchangedCount: 0,
		closedCount: 0,
		reopenedCount: 0,
	};
	const errors: unknown[] = [];

	const run = await db.grantSyncRun.create({
		data: {
			source: adapter.source,
			status: $Enums.ImportStatus.IN_PROGRESS,
		},
	});

	const runner = executeIngest(adapter, run.id, runCounters, errors);

	if (options?.fireAndForget) {
		runner.catch((err) => {
			console.error('Ingest run failed:', err);
		});
		return { runId: run.id };
	}

	await runner;
	return { runId: run.id };
}

async function executeIngest(
	adapter: GrantSourceAdapter,
	runId: string,
	runCounters: RunCounters,
	errors: unknown[],
) {
	try {
		if (adapter.getSchema) {
			try {
				const schema = await adapter.getSchema();
				const schemaJson = (schema ?? Prisma.JsonNull) as Prisma.InputJsonValue;
				await db.grantSyncRun.update({
					where: { id: runId },
					data: { schemaJson },
				});
			} catch (err) {
				addError(errors, formatError(err));
				// Continue without schema; do not fail the run.
			}
		}

		let batch: Promise<void>[] = [];

		for await (const record of adapter.getRecords()) {
			runCounters.recordsFetched += 1;
			const task = processRecord(adapter, record, runId, runCounters, errors);
			batch.push(task);
			if (batch.length >= CONCURRENCY) {
				await Promise.allSettled(batch);
				batch = [];
			}
		}

		if (batch.length) {
			await Promise.allSettled(batch);
		}

		await db.grantSyncRun.update({
			where: { id: runId },
			data: {
				status: $Enums.ImportStatus.COMPLETED,
				finishedAt: new Date(),
				recordsFetched: runCounters.recordsFetched,
				createdCount: runCounters.createdCount,
				updatedCount: runCounters.updatedCount,
				unchangedCount: runCounters.unchangedCount,
				closedCount: runCounters.closedCount,
				reopenedCount: runCounters.reopenedCount,
				errorsJson: errors.length
					? (errors.slice(0, MAX_ERRORS) as Prisma.InputJsonValue)
					: Prisma.JsonNull,
			},
		});
	} catch (err) {
		errors.push(formatError(err));
		await db.grantSyncRun.update({
			where: { id: runId },
			data: {
				status: $Enums.ImportStatus.FAILED,
				finishedAt: new Date(),
				errorsJson: errors.slice(0, MAX_ERRORS) as Prisma.InputJsonValue,
				recordsFetched: runCounters.recordsFetched,
				createdCount: runCounters.createdCount,
				updatedCount: runCounters.updatedCount,
				unchangedCount: runCounters.unchangedCount,
				closedCount: runCounters.closedCount,
				reopenedCount: runCounters.reopenedCount,
			},
		});
		throw err;
	}
}

async function processRecord(
	adapter: GrantSourceAdapter,
	record: Record<string, unknown>,
	runId: string,
	counters: RunCounters,
	errors: unknown[],
) {
	try {
		const normalized = adapter.mapRecord(record);
		if (!normalized) return;

		const parsed = normalizedGrantSchema.safeParse({
			...normalized,
			source: normalized.source,
			status: normalized.status,
		});
		if (!parsed.success) {
			addError(errors, {
				message: 'Validation failed',
				issues: parsed.error.issues,
				sourceRecordId: normalized.sourceRecordId,
			});
			return;
		}

		const result = await upsertGrantFromNormalized(
			db,
			{ id: runId, source: adapter.source },
			normalized as NormalizedGrantInput,
		);

		counters.createdCount += result.created ? 1 : 0;
		counters.updatedCount += result.updated ? 1 : 0;
		counters.unchangedCount += result.unchanged ? 1 : 0;
		counters.closedCount += result.closed ? 1 : 0;
		counters.reopenedCount += result.reopened ? 1 : 0;
	} catch (err) {
		addError(errors, formatError(err));
	}
}

function addError(errors: unknown[], err: unknown) {
	if (errors.length < MAX_ERRORS) {
		errors.push(err);
	}
}

function formatError(err: unknown) {
	if (err instanceof Error) {
		return { message: err.message, stack: err.stack };
	}
	return { message: String(err) };
}
