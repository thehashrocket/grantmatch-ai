import { db } from '@/lib/db';
import { upsertGrantFromNormalized } from '@/server/grants/ingest/upsertGrant';
import {
  type GrantSourceAdapter,
  type NormalizedGrantInput,
  type RunCounters,
} from '@/server/grants/ingest/types';
import { $Enums } from '@/prisma/generated/client';
import { z } from 'zod';

const CONCURRENCY = 15;
const MAX_ERRORS = 20;

const normalizedGrantSchema = z.object({
  source: z.string(),
  sourceRecordId: z.string().optional(),
  sourceKey: z.string().optional(),
  number: z.string().optional(),
  url: z.string().url(),
  title: z.string().min(1),
  grantor: z.string().min(1),
  stateAgency: z.string().optional(),
  purpose: z.string().optional(),
  description: z.string().optional(),
  eligibleApplicants: z.array(z.string()).optional(),
  eligibleGeographies: z.string().optional(),
  openDate: z.date().optional(),
  deadline: z.date().optional(),
  opportunityType: z.string().optional(),
  currentAsOf: z.date().optional(),
  portalId: z.number().int().nullable().optional(),
  matchFunding: z.string().optional(),
  estimatedTotalFunding: z.union([z.bigint(), z.number()]).nullable().optional(),
  awardFloor: z.union([z.bigint(), z.number()]).nullable().optional(),
  awardCeiling: z.union([z.bigint(), z.number()]).nullable().optional(),
  estimatedAwardAmounts: z.string().optional(),
  fundsDisbursment: z.string().optional(),
  agencyCode: z.string().optional(),
  cfdaList: z.array(z.string()).optional(),
  status: z.nativeEnum($Enums.GrantStatus),
  closedAt: z.date().nullable().optional(),
  contentHash: z.string(),
  lastSeenAt: z.date(),
});

export async function runIngest(adapter: GrantSourceAdapter): Promise<{ runId: string }> {
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

  try {
    if (adapter.getSchema) {
      try {
        const schema = await adapter.getSchema();
        await db.grantSyncRun.update({ where: { id: run.id }, data: { schemaJson: schema } });
      } catch (err) {
        addError(errors, formatError(err));
        // Continue without schema; do not fail the run.
      }
    }

    let batch: Promise<void>[] = [];

    for await (const record of adapter.getRecords()) {
      runCounters.recordsFetched += 1;
      const task = processRecord(adapter, record, run.id, runCounters, errors);
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
      where: { id: run.id },
      data: {
        status: $Enums.ImportStatus.COMPLETED,
        finishedAt: new Date(),
        recordsFetched: runCounters.recordsFetched,
        createdCount: runCounters.createdCount,
        updatedCount: runCounters.updatedCount,
        unchangedCount: runCounters.unchangedCount,
        closedCount: runCounters.closedCount,
        reopenedCount: runCounters.reopenedCount,
        errorsJson: errors.length ? errors.slice(0, MAX_ERRORS) : null,
      },
    });
  } catch (err) {
    errors.push(formatError(err));
    await db.grantSyncRun.update({
      where: { id: run.id },
      data: {
        status: $Enums.ImportStatus.FAILED,
        finishedAt: new Date(),
        errorsJson: errors.slice(0, MAX_ERRORS),
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

  return { runId: run.id };
}

async function processRecord(
  adapter: GrantSourceAdapter,
  record: Record<string, unknown>,
  runId: string,
  counters: RunCounters,
  errors: unknown[]
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
      addError(errors, { message: 'Validation failed', issues: parsed.error.issues, sourceRecordId: normalized.sourceRecordId });
      return;
    }

    const result = await upsertGrantFromNormalized(db, { id: runId, source: adapter.source }, normalized as NormalizedGrantInput);

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
