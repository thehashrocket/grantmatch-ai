import { diffObjects } from '@/server/grants/ingest/normalize';
import { getDetailFetcher } from '@/server/grants/details/fetchers';
import type { GrantWithRelations } from '@/server/grants/details/types';
import { type PrismaClient, Prisma, $Enums } from '@/prisma/generated/client';

const TTL_MS: Record<$Enums.GrantSource | 'DEFAULT', number> = {
  [$Enums.GrantSource.FEDERAL]: 1000 * 60 * 60 * 24 * 7,
  [$Enums.GrantSource.CALIFORNIA]: 1000 * 60 * 60 * 24 * 30,
  [$Enums.GrantSource.OHIO]: 1000 * 60 * 60 * 24 * 7,
  [$Enums.GrantSource.OTHER]: 1000 * 60 * 60 * 24 * 7,
  DEFAULT: 1000 * 60 * 60 * 24 * 7,
};

type EnsureOpts = { timeoutMs?: number; force?: boolean };

export async function ensureGrantDetail(
  prisma: PrismaClient,
  grantId: string,
  opts: EnsureOpts = {}
): Promise<{ fetched: boolean; error?: string }> {
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    include: { details: true, attachments: true },
  });

  if (!grant) return { fetched: false, error: 'not found' };

  const ttl = TTL_MS[grant.source] ?? TTL_MS.DEFAULT;
  const fetchedAt = grant.details?.fetchedAt;
  const isStale = !fetchedAt || Date.now() - fetchedAt.getTime() > ttl;
  if (!opts.force && !isStale) return { fetched: false };

  let runId: string | null = null;
  let fetcher: ReturnType<typeof getDetailFetcher> | null = null;
  const observedAt = new Date();

  try {
    fetcher = getDetailFetcher(grant.source);

    const run = await prisma.grantSyncRun.create({
      data: {
        source: grant.source,
        status: $Enums.ImportStatus.IN_PROGRESS,
        schemaJson: { kind: 'on_demand_details', source: grant.source, endpoint: fetcher.endpoint },
        recordsFetched: 0,
        createdCount: 0,
        updatedCount: 0,
        unchangedCount: 0,
        closedCount: 0,
        reopenedCount: 0,
      },
    });
    runId = run.id;

    const beforeDetails = grant.details
      ? {
          description: grant.details.description,
          eligibilityRequirements: grant.details.eligibilityRequirements,
          fundingDetails: grant.details.fundingDetails,
          purpose: grant.details.purpose,
          synopsisHtml: grant.details.synopsisHtml,
          applicantEligibilityDesc: grant.details.applicantEligibilityDesc,
          fundingDescLinkUrl: grant.details.fundingDescLinkUrl,
          responseDateDesc: grant.details.responseDateDesc,
          rawJson: grant.details.rawJson,
        }
      : null;

    const result = await fetcher.fetch(grant as GrantWithRelations, { timeoutMs: opts.timeoutMs });
    const detailData: Partial<Prisma.GrantDetailUncheckedCreateInput> = {
      ...result.detail,
      fetchedAt: result.detail.fetchedAt ?? observedAt,
      rawJson: (result.detail.rawJson ?? (result.raw as Prisma.InputJsonValue | undefined)) ?? undefined,
    };

    await prisma.$transaction(async (tx) => {
      await tx.grantDetail.upsert({
        where: { grantId },
        create: { ...detailData, grantId },
        update: detailData,
      });

      await tx.grantAttachment.deleteMany({ where: { grantId } });
      if (result.attachments.length) {
        await tx.grantAttachment.createMany({
          data: result.attachments.map((attachment) => ({ ...attachment, grantId })),
        });
      }

      if (result.grantPatch && Object.keys(result.grantPatch).length > 0) {
        await tx.grant.update({
          where: { id: grantId },
          data: result.grantPatch,
        });
      }
    });

    const afterDetails = {
      description: detailData.description ?? null,
      eligibilityRequirements: detailData.eligibilityRequirements ?? null,
      fundingDetails: detailData.fundingDetails ?? null,
      purpose: detailData.purpose ?? null,
      synopsisHtml: detailData.synopsisHtml ?? null,
      applicantEligibilityDesc: detailData.applicantEligibilityDesc ?? null,
      fundingDescLinkUrl: detailData.fundingDescLinkUrl ?? null,
      responseDateDesc: detailData.responseDateDesc ?? null,
      rawJson: detailData.rawJson ?? null,
    };

    const diff = diffObjects(beforeDetails, afterDetails) ?? {};
    const afterUrl = (result.grantPatch?.url as string | null | undefined) ?? grant.url;
    const afterCurrentAsOf = (result.grantPatch?.currentAsOf as Date | null | undefined) ?? grant.currentAsOf;
    const afterStatus = (result.grantPatch?.status as $Enums.GrantStatus | undefined) ?? grant.status;

    if (result.grantPatch?.url !== undefined && grant.url !== afterUrl) {
      diff.url = { old: grant.url, new: afterUrl };
    }
    if (result.grantPatch?.currentAsOf !== undefined && grant.currentAsOf?.getTime() !== afterCurrentAsOf?.getTime()) {
      diff.currentAsOf = { old: grant.currentAsOf, new: afterCurrentAsOf };
    }
    if (result.grantPatch?.status !== undefined && grant.status !== afterStatus) {
      diff.status = { old: grant.status, new: afterStatus };
    }

    await prisma.grantChange.create({
      data: {
        grantId,
        runId: run.id,
        changeType: 'DETAILS_FETCHED',
        oldHash: grant.contentHash ?? undefined,
        newHash: grant.contentHash ?? undefined,
        diffJson: Object.keys(diff).length ? (diff as Prisma.InputJsonValue) : Prisma.JsonNull,
        observedAt,
      },
    });

    await prisma.grantSyncRun.update({
      where: { id: run.id },
      data: {
        status: $Enums.ImportStatus.COMPLETED,
        finishedAt: new Date(),
        recordsFetched: 1,
        updatedCount: 1,
      },
    });

    return { fetched: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    if (runId) {
      await prisma.grantChange.create({
        data: {
          grantId,
          runId,
          changeType: 'DETAILS_FETCH_FAILED',
          oldHash: grant.contentHash ?? undefined,
          newHash: grant.contentHash ?? undefined,
          diffJson: {
            message,
            source: grant.source,
            endpoint: fetcher?.endpoint ?? 'unknown',
          } as Prisma.InputJsonValue,
          observedAt,
        },
      });

      await prisma.grantSyncRun.update({
        where: { id: runId },
        data: {
          status: $Enums.ImportStatus.FAILED,
          finishedAt: new Date(),
          errorsJson: [{ message }] as Prisma.InputJsonValue,
        },
      });
    }

    return { fetched: false, error: message };
  }
}
