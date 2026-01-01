// /src/server/grants/ingest/tickIngest.ts

import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, $Enums } from '@/prisma/generated/client';
import { caCkanAdapter } from '@/server/grants/sources/caCkanAdapter';
import { federalGrantsGovAdapter } from '@/server/grants/sources/federalGrantsGovAdapter';
import type {
	GrantSourceAdapter,
	NormalizedGrantInput,
} from '@/server/grants/ingest/types';
import { upsertGrantFromNormalized } from '@/server/grants/ingest/upsertGrant';
import { MAX_TICK_ERRORS, normalizedGrantSchema } from './validation';

type TickPrisma = Pick<PrismaClient, '$queryRaw' | 'grantSyncRun'>;

type RunRow = {
	id: string;
	source: $Enums.GrantSource;
	status: $Enums.ImportStatus;
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
	finishedAt: Date | null;
	errorsJson: Prisma.JsonValue | null;
	schemaJson: Prisma.JsonValue | null;
};

type TickSchema = {
	cursor?: unknown;
	tickClaimId?: string;
	tickClaimedAt?: string;
	tickErrors?: unknown[];
};

export type TickRunSummary = {
	id: string;
	source: $Enums.GrantSource;
	status: $Enums.ImportStatus;
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
	finishedAt: Date | null;
	errorsJson: Prisma.JsonValue | null;
	schema: TickSchema;
};

export type ClaimResult =
	| {
			claimed: true;
			run: TickRunSummary;
	  }
	| {
			claimed: false;
			reason: 'TICK_ALREADY_CLAIMED' | 'NOT_IN_PROGRESS' | 'NOT_FOUND';
			run?: TickRunSummary;
	  };

export type TickDeltas = {
	fetchedDelta: number;
	createdDelta: number;
	updatedDelta: number;
	unchangedDelta: number;
	closedDelta: number;
	reopenedDelta: number;
};

export type CommitArgs = {
	runId: string;
	tickClaimId: string;
	deltas: TickDeltas;
	nextCursor: unknown;
	done: boolean;
	errors?: unknown[];
	currentSchema?: TickSchema;
};

export type CommitResult =
	| { committed: true; run: TickRunSummary }
	| { committed: false; reason: 'STALE_CLAIM' };

export async function startTickIngest(
	prisma: PrismaClient,
	adapter: GrantSourceAdapter,
): Promise<{ runId: string }> {
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

	const run = await prisma.grantSyncRun.create({
		data: {
			source: adapter.source,
			status: $Enums.ImportStatus.IN_PROGRESS,
			schemaJson,
		},
	});

	return { runId: run.id };
}

export async function claimTick(
	prisma: TickPrisma,
	runId: string,
	staleAfterSeconds = 30,
): Promise<ClaimResult> {
	const tickClaimId = randomUUID();
	const tickClaimedAt = new Date().toISOString();

	const claim = await prisma.$queryRaw<RunRow[]>`
		UPDATE "GrantSyncRun"
		SET "schemaJson" = jsonb_set(
				jsonb_set(
					COALESCE("schemaJson", '{}'::jsonb),
					'{tickClaimId}',
					to_jsonb(${tickClaimId}::text),
					true
				),
				'{tickClaimedAt}',
				to_jsonb(${tickClaimedAt}::timestamptz),
				true
			)
		WHERE "id" = ${runId}
			AND "status" = ${$Enums.ImportStatus.IN_PROGRESS}
			AND (
				("schemaJson"->>'tickClaimId') IS NULL
				OR ("schemaJson"->>'tickClaimedAt') IS NULL
				OR ("schemaJson"->>'tickClaimedAt')::timestamptz < NOW() - (${staleAfterSeconds} * INTERVAL '1 second')
			)
		RETURNING
			"id",
			"source",
			"status",
			"recordsFetched",
			"createdCount",
			"updatedCount",
			"unchangedCount",
			"closedCount",
			"reopenedCount",
			"finishedAt",
			"errorsJson",
			"schemaJson";
	`;

	if (claim.length > 0) {
		const run = mapRunRow(claim[0]);
		logDebug('claim:granted', {
			runId: run.id,
			source: run.source,
			cursor: run.schema.cursor ?? null,
			status: run.status,
		});
		return { claimed: true, run };
	}

	const existing = await prisma.grantSyncRun.findUnique({
		where: { id: runId },
		select: {
			id: true,
			source: true,
			status: true,
			recordsFetched: true,
			createdCount: true,
			updatedCount: true,
			unchangedCount: true,
			closedCount: true,
			reopenedCount: true,
			finishedAt: true,
			errorsJson: true,
			schemaJson: true,
		},
	});

	if (!existing) {
		return { claimed: false, reason: 'NOT_FOUND' };
	}

	if (existing.status !== $Enums.ImportStatus.IN_PROGRESS) {
		return {
			claimed: false,
			reason: 'NOT_IN_PROGRESS',
			run: mapRunRow(existing),
		};
	}

	const run = mapRunRow(existing);
	logDebug('claim:rejected', {
		runId: run.id,
		source: run.source,
		cursor: run.schema.cursor ?? null,
		status: run.status,
		reason: 'TICK_ALREADY_CLAIMED',
	});

	return {
		claimed: false,
		reason: 'TICK_ALREADY_CLAIMED',
		run,
	};
}

export async function commitTick(
	prisma: TickPrisma,
	args: CommitArgs,
): Promise<CommitResult> {
	logDebug('commit:start', {
		runId: args.runId,
		tickClaimId: args.tickClaimId,
		nextCursor: args.nextCursor ?? null,
		done: args.done,
		deltas: args.deltas,
		errors: args.errors?.length ?? 0,
	});

	const errors = (args.errors ?? []).slice(0, MAX_TICK_ERRORS);
	const baseSchema: TickSchema = (args.currentSchema ?? {}) as TickSchema;
	const mergedErrors = [
		...(Array.isArray(baseSchema.tickErrors)
			? (baseSchema.tickErrors as unknown[])
			: []),
		...errors,
	].slice(0, MAX_TICK_ERRORS);

	const nextCursor = args.done ? undefined : (args.nextCursor ?? null);
	const updatedSchema: Record<string, unknown> = { ...baseSchema };
	if (args.done) {
		delete updatedSchema.cursor;
	} else {
		updatedSchema.cursor = nextCursor;
	}

	if (mergedErrors.length > 0) {
		updatedSchema.tickErrors = mergedErrors;
	} else {
		delete updatedSchema.tickErrors;
	}

	delete updatedSchema.tickClaimId;
	delete updatedSchema.tickClaimedAt;

	const schemaJsonString = JSON.stringify(updatedSchema);
	const errorsLiteral = Prisma.sql`${JSON.stringify(errors)}::jsonb`;

	const update = await prisma.$queryRaw<RunRow[]>`
		UPDATE "GrantSyncRun"
		SET
			"recordsFetched" = "recordsFetched" + ${args.deltas.fetchedDelta},
			"createdCount" = "createdCount" + ${args.deltas.createdDelta},
			"updatedCount" = "updatedCount" + ${args.deltas.updatedDelta},
			"unchangedCount" = "unchangedCount" + ${args.deltas.unchangedDelta},
			"closedCount" = "closedCount" + ${args.deltas.closedDelta},
			"reopenedCount" = "reopenedCount" + ${args.deltas.reopenedDelta},
			"errorsJson" = CASE
				WHEN ${errors.length > 0}
					THEN COALESCE("errorsJson", '[]'::jsonb) || ${errorsLiteral}
				ELSE "errorsJson"
			END,
			"schemaJson" = ${schemaJsonString}::jsonb,
			"status" = CASE WHEN ${args.done} THEN ${$Enums.ImportStatus.COMPLETED}::"ImportStatus" ELSE "status" END,
			"finishedAt" = CASE WHEN ${args.done} THEN NOW() ELSE "finishedAt" END
		WHERE "id" = ${args.runId}
			AND "schemaJson"->>'tickClaimId' = ${args.tickClaimId}
		RETURNING
			"id",
			"source",
			"status",
			"recordsFetched",
			"createdCount",
			"updatedCount",
			"unchangedCount",
			"closedCount",
			"reopenedCount",
			"finishedAt",
			"errorsJson",
			"schemaJson";
	`;

	if (!update.length) {
		logDebug('commit:stale', {
			runId: args.runId,
			tickClaimId: args.tickClaimId,
		});
		return { committed: false, reason: 'STALE_CLAIM' };
	}

	const run = mapRunRow(update[0]);
	logDebug('commit:schema', {
		runId: run.id,
		rawSchema: update[0].schemaJson,
		mappedCursor: run.schema.cursor ?? null,
	});
	logDebug('commit:applied', {
		runId: run.id,
		source: run.source,
		cursor: run.schema.cursor ?? null,
		done: args.done,
		deltas: args.deltas,
	});

	return { committed: true, run };
}

export async function runTick(
	prisma: PrismaClient,
	runId: string,
	staleAfterSeconds = 30,
): Promise<{ claimed: boolean; result?: CommitResult; claim?: ClaimResult }> {
	const claim = await claimTick(prisma, runId, staleAfterSeconds);
	if (!claim.claimed) {
		return { claimed: false, claim };
	}

	const adapter = getAdapter(claim.run.source);
	if (!adapter) {
		const commit = await commitTick(prisma, {
			runId,
			tickClaimId: claim.run.schema.tickClaimId as string,
			deltas: emptyDeltas(),
			nextCursor: claim.run.schema.cursor ?? null,
			done: false,
			currentSchema: claim.run.schema,
			errors: [
				{
					message: `No adapter registered for source ${claim.run.source}`,
				},
			],
		});
		return { claimed: true, result: commit };
	}

	const work = await performWork(prisma, adapter, claim.run);
	const commit = await commitTick(prisma, {
		runId,
		tickClaimId: claim.run.schema.tickClaimId as string,
		deltas: work.deltas,
		nextCursor: work.nextCursor,
		done: work.done,
		currentSchema: claim.run.schema,
		errors: work.errors,
	});

	return { claimed: true, result: commit };
}

async function performWork(
	prisma: PrismaClient,
	adapter: GrantSourceAdapter,
	run: TickRunSummary,
) {
	const errors: unknown[] = [];

	let page: Awaited<ReturnType<GrantSourceAdapter['getPage']>>;
	logDebug('tick:start', {
		runId: run.id,
		source: run.source,
		cursor: run.schema.cursor ?? null,
	});
	try {
		page = await adapter.getPage(run.schema.cursor);
	} catch (err) {
		logDebug('tick:error', {
			runId: run.id,
			source: run.source,
			cursor: run.schema.cursor ?? null,
			error: formatError(err),
		});
		return {
			deltas: emptyDeltas(),
			nextCursor: run.schema.cursor ?? null,
			done: false,
			errors: [formatError(err)],
		};
	}

	const deltas: TickDeltas = {
		fetchedDelta: page.records.length,
		createdDelta: 0,
		updatedDelta: 0,
		unchangedDelta: 0,
		closedDelta: 0,
		reopenedDelta: 0,
	};

	for (const record of page.records) {
		try {
			const normalized = adapter.mapRecord(record);
			if (!normalized) continue;

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
				continue;
			}

			const result = await upsertGrantFromNormalized(
				prisma,
				{ id: run.id, source: run.source },
				normalized as NormalizedGrantInput,
			);

			deltas.createdDelta += result.created ? 1 : 0;
			deltas.updatedDelta += result.updated ? 1 : 0;
			deltas.unchangedDelta += result.unchanged ? 1 : 0;
			deltas.closedDelta += result.closed ? 1 : 0;
			deltas.reopenedDelta += result.reopened ? 1 : 0;
		} catch (err) {
			addError(errors, formatError(err));
		}
	}

	const done =
		!!page.done || page.records.length === 0 || page.nextCursor === undefined;
	const nextCursor = done ? null : (page.nextCursor ?? null);

	logDebug('tick:page', {
		runId: run.id,
		source: run.source,
		cursor: run.schema.cursor ?? null,
		records: page.records.length,
		nextCursor,
		done,
		errors: errors.length,
	});

	return { deltas, nextCursor, done, errors };
}

function getAdapter(source: $Enums.GrantSource): GrantSourceAdapter | null {
	if (source === $Enums.GrantSource.CALIFORNIA) return caCkanAdapter;
	if (source === $Enums.GrantSource.FEDERAL) return federalGrantsGovAdapter;
	return null;
}

function mapRunRow(row: RunRow): TickRunSummary {
	return {
		id: row.id,
		source: row.source,
		status: row.status,
		recordsFetched: row.recordsFetched,
		createdCount: row.createdCount,
		updatedCount: row.updatedCount,
		unchangedCount: row.unchangedCount,
		closedCount: row.closedCount,
		reopenedCount: row.reopenedCount,
		finishedAt: row.finishedAt,
		errorsJson: row.errorsJson,
		schema: toSchema(row.schemaJson),
	};
}

function toSchema(value: Prisma.JsonValue | null): TickSchema {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return {};
	}
	const schema = value as Record<string, unknown>;
	return {
		cursor: schema.cursor,
		tickClaimId: schema.tickClaimId as string | undefined,
		tickClaimedAt: schema.tickClaimedAt as string | undefined,
		tickErrors: (schema.tickErrors as unknown[]) ?? undefined,
	};
}

function emptyDeltas(): TickDeltas {
	return {
		fetchedDelta: 0,
		createdDelta: 0,
		updatedDelta: 0,
		unchangedDelta: 0,
		closedDelta: 0,
		reopenedDelta: 0,
	};
}

function addError(errors: unknown[], err: unknown) {
	if (errors.length < MAX_TICK_ERRORS) {
		errors.push(err);
	}
}

function formatError(err: unknown) {
	if (err instanceof Error) {
		return { message: err.message, stack: err.stack };
	}
	return { message: String(err) };
}

const debugEnabled =
	process.env.GRANT_SYNC_DEBUG?.toLowerCase() === 'true' ||
	process.env.GRANT_SYNC_DEBUG === '1';

function logDebug(message: string, payload?: Record<string, unknown>) {
	if (!debugEnabled) return;
	// eslint-disable-next-line no-console
	console.info('[grant-sync]', message, payload ?? '');
}
