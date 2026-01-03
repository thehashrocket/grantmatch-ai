import { db } from '@/lib/db';
import { Prisma, $Enums, type PrismaClient } from '@/prisma/generated/client';
import { runTick } from '@/server/grants/ingest/tickIngest';
import { caCkanAdapter } from '@/server/grants/sources/caCkanAdapter';
import { federalGrantsGovAdapter } from '@/server/grants/sources/federalGrantsGovAdapter';
import type { GrantSourceAdapter } from '@/server/grants/ingest/types';

const DEFAULT_STALE_MINUTES = 120;
const DEFAULT_TICK_STALE_SECONDS = 60;
const DEFAULT_MAX_RUNTIME_MS = 4.5 * 60 * 1000; // leave headroom under 5m Vercel limit

type GrantSyncSource = 'federal' | 'california';

type RunCounts = {
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
};

type RunSummary = RunCounts & {
	runId: string;
	source: GrantSyncSource;
	status: $Enums.ImportStatus;
	startedAt: Date;
	finishedAt: Date | null;
};

type ClaimResult =
	| { claimed: true; run: RunSummary }
	| { claimed: false; run?: RunSummary };

const sourceConfig: Record<
	GrantSyncSource,
	{ adapter: GrantSourceAdapter; source: $Enums.GrantSource }
> = {
	federal: {
		adapter: federalGrantsGovAdapter,
		source: $Enums.GrantSource.FEDERAL,
	},
	california: { adapter: caCkanAdapter, source: $Enums.GrantSource.CALIFORNIA },
};

const runSelect = {
	id: true,
	source: true,
	status: true,
	startedAt: true,
	finishedAt: true,
	recordsFetched: true,
	createdCount: true,
	updatedCount: true,
	unchangedCount: true,
	closedCount: true,
	reopenedCount: true,
} satisfies Prisma.GrantSyncRunSelect;

type RunRow = Prisma.GrantSyncRunGetPayload<{ select: typeof runSelect }>;

export async function runGrantSync(
	source: GrantSyncSource,
	options?: {
		staleMinutes?: number;
		driveTicks?: boolean;
		maxRuntimeMs?: number;
		tickStaleAfterSeconds?: number;
		prisma?: PrismaClient;
	},
): Promise<{
	ok: boolean;
	skipped?: boolean;
	reason?: string;
	run?: RunSummary;
}> {
	const prisma = options?.prisma ?? db;
	const config = sourceConfig[source];

	const staleMinutes = options?.staleMinutes ?? DEFAULT_STALE_MINUTES;
	const tickStaleAfterSeconds =
		options?.tickStaleAfterSeconds ?? DEFAULT_TICK_STALE_SECONDS;
	const maxRuntimeMs = options?.maxRuntimeMs ?? DEFAULT_MAX_RUNTIME_MS;

	const schemaJson = await buildSchemaJson(config.adapter);

	const claim = await claimRun(prisma, config, schemaJson, staleMinutes);
	if (!claim.claimed) {
		if (claim.run) {
			console.info('[cron-sync]', source, 'skipped: lock held', {
				runId: claim.run.runId,
				startedAt: claim.run.startedAt.toISOString(),
			});
		}
		return { ok: true, skipped: true, reason: 'lock-held', run: claim.run };
	}

	let runSummary = claim.run;

	if (options?.driveTicks ?? true) {
		const driven = await driveTicksToCompletion(prisma, runSummary.runId, {
			tickStaleAfterSeconds,
			maxRuntimeMs,
		});
		if (driven) {
			runSummary = driven;
		} else {
			console.warn('[cron-sync]', source, 'drive incomplete', {
				runId: runSummary.runId,
			});
		}
	}

	return { ok: true, run: runSummary };
}

async function buildSchemaJson(adapter: GrantSourceAdapter) {
	let schemaJson: Prisma.InputJsonValue | undefined = { cursor: null };
	try {
		if (adapter.getSchema) {
			const schema = await adapter.getSchema();
			schemaJson = {
				...(schema ?? {}),
				cursor: null,
			} as Prisma.InputJsonValue;
		}
	} catch {
		// Ignore schema fetch failures; run can still proceed.
	}
	return schemaJson;
}

async function claimRun(
	prisma: PrismaClient,
	config: (typeof sourceConfig)[GrantSyncSource],
	schemaJson: Prisma.InputJsonValue,
	staleMinutes: number,
): Promise<ClaimResult> {
	const staleCutoff = new Date(Date.now() - staleMinutes * 60 * 1000);

	const attempt = async (): Promise<ClaimResult> => {
		return prisma.$transaction(
			async (tx) => {
				await tx.grantSyncRun.updateMany({
					where: {
						source: config.source,
						status: $Enums.ImportStatus.IN_PROGRESS,
						startedAt: { lt: staleCutoff },
					},
					data: {
						status: $Enums.ImportStatus.FAILED,
						finishedAt: new Date(),
						errorsJson: [
							{
								message: `Marked stale after ${staleMinutes} minutes without completion`,
								markedAt: new Date().toISOString(),
							},
						] as Prisma.InputJsonValue,
					},
				});

				const existing = await tx.grantSyncRun.findFirst({
					where: {
						source: config.source,
						status: $Enums.ImportStatus.IN_PROGRESS,
						startedAt: { gte: staleCutoff },
					},
					select: runSelect,
					orderBy: { startedAt: 'desc' },
				});

				if (existing) {
					return { claimed: false, run: mapRunRow(existing) };
				}

				const created = await tx.grantSyncRun.create({
					data: {
						source: config.source,
						status: $Enums.ImportStatus.IN_PROGRESS,
						schemaJson,
					},
					select: runSelect,
				});

				const run = mapRunRow(created);
				console.info('[cron-sync]', run.source, 'lock acquired', {
					runId: run.runId,
					startedAt: run.startedAt.toISOString(),
				});
				return { claimed: true, run };
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	};

	try {
		return await attempt();
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2034'
		) {
			// Serialization failure; retry once to honor the lock contract.
			return attempt();
		}
		throw error;
	}
}

async function driveTicksToCompletion(
	prisma: PrismaClient,
	runId: string,
	options: { tickStaleAfterSeconds: number; maxRuntimeMs: number },
) {
	const startedAt = Date.now();

	while (Date.now() - startedAt < options.maxRuntimeMs) {
		const tick = await runTick(prisma, runId, options.tickStaleAfterSeconds);

		if (!tick.claimed) {
			const reason =
				tick.claim && 'reason' in tick.claim ? tick.claim.reason : 'unknown';
			if (reason === 'NOT_FOUND' || reason === 'NOT_IN_PROGRESS') {
				break;
			}
			await wait(250);
			continue;
		}

		if (tick.result?.committed) {
			if (tick.result.run.status !== $Enums.ImportStatus.IN_PROGRESS) {
				break;
			}
			await wait(100);
			continue;
		}

		await wait(250);
	}

	const run = await prisma.grantSyncRun.findUnique({
		where: { id: runId },
		select: runSelect,
	});
	return run ? mapRunRow(run) : undefined;
}

function mapRunRow(row: RunRow): RunSummary {
	return {
		runId: row.id,
		source:
			row.source === $Enums.GrantSource.FEDERAL ? 'federal' : 'california',
		status: row.status,
		startedAt: row.startedAt,
		finishedAt: row.finishedAt,
		recordsFetched: row.recordsFetched,
		createdCount: row.createdCount,
		updatedCount: row.updatedCount,
		unchangedCount: row.unchangedCount,
		closedCount: row.closedCount,
		reopenedCount: row.reopenedCount,
	};
}

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
