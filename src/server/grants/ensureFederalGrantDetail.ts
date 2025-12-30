import { diffObjects } from '@/server/grants/ingest/normalize';
import { normalizeOppStatusToGrantStatus, parseFederalDateMMDDYYYY, postFormWithRetry } from '@/server/grants/sources/federalClient';
import { Prisma, type PrismaClient } from '@/prisma/generated/client';
import { $Enums } from '@/prisma/generated/client';

const FEDERAL_DETAILS_URL = 'https://apply07.grants.gov/grantsws/rest/opportunity/details';
type FederalSynopsis = {
  opportunityTitle?: string;
  opportunityCategory?: { description?: string };
  synopsisDesc?: string;
  applicantTypes?: unknown;
  applicantEligibilityDesc?: string;
  eligibilityDescription?: string;
  estimatedFunding?: unknown;
  estFunding?: unknown;
  numberOfAwards?: unknown;
  fundingActivityCategories?: unknown;
  fundingActivityCategory?: { description?: string };
  fundingInstruments?: unknown;
  fundingDescLinkUrl?: string;
  synopsisURL?: string;
  fundingDescLinkDesc?: string;
  synopsisAttachmentFolders?: unknown;
  responseDateDesc?: string;
  postingDate?: string;
  archiveDate?: string;
  lastUpdatedDate?: string;
  closeDate?: string;
  oppStatus?: string;
};

type FederalDetails = {
  synopsis?: FederalSynopsis;
  opportunity?: FederalSynopsis;
  opportunityTitle?: string;
  applicantTypes?: unknown;
  applicantEligibilityDesc?: string;
  eligibilityDescription?: string;
  fundingActivityCategory?: { description?: string };
  fundingDescLinkUrl?: string;
  synopsisURL?: string;
};

type EnsureOpts = { timeoutMs?: number };

export async function ensureFederalGrantDetail(
  prisma: PrismaClient,
  grantId: string,
  opts: EnsureOpts = {}
): Promise<{ fetched: boolean; error?: string }> {
  const grant = await prisma.grant.findUnique({
    where: { id: grantId },
    include: { details: true },
  });
  if (!grant) return { fetched: false, error: 'not found' };
  if (grant.source !== $Enums.GrantSource.FEDERAL) return { fetched: false };
  if (grant.details) return { fetched: false };
  if (!grant.sourceRecordId) return { fetched: false, error: 'missing sourceRecordId' };

  const run = await prisma.grantSyncRun.create({
    data: {
      source: $Enums.GrantSource.FEDERAL,
      status: $Enums.ImportStatus.IN_PROGRESS,
      schemaJson: { kind: 'on_demand_details', endpoint: FEDERAL_DETAILS_URL },
      recordsFetched: 0,
      createdCount: 0,
      updatedCount: 0,
      unchangedCount: 0,
      closedCount: 0,
      reopenedCount: 0,
    },
  });

  try {
    const body = `oppId=${encodeURIComponent(grant.sourceRecordId)}`;
    const details = await postFormWithRetry<FederalDetails>(FEDERAL_DETAILS_URL, body, {
      timeoutMs: opts.timeoutMs ?? 8000,
    });

    const synopsis = details?.synopsis ?? details?.opportunity ?? {};
    const title = synopsis.opportunityTitle ?? details?.opportunityTitle ?? grant.title;
    const purpose = synopsis.opportunityCategory?.description ?? '';
    const description = synopsis.synopsisDesc ?? '';

    const eligibilityRequirements = {
      applicantTypes: synopsis.applicantTypes ?? details?.applicantTypes ?? null,
      applicantEligibilityDesc: synopsis.applicantEligibilityDesc ?? synopsis.eligibilityDescription ?? '',
    } as Prisma.InputJsonValue;

    const fundingDetails: Prisma.InputJsonValue = {
      estimatedFunding: synopsis.estimatedFunding ?? synopsis.estFunding ?? null,
      numberOfAwards: synopsis.numberOfAwards ?? null,
      fundingActivityCategories: synopsis.fundingActivityCategories ?? synopsis.fundingActivityCategory?.description ?? null,
      fundingInstruments: synopsis.fundingInstruments ?? null,
      fundingDescLinkUrl: synopsis.fundingDescLinkUrl ?? synopsis.synopsisURL ?? null,
      fundingDescLinkDesc: synopsis.fundingDescLinkDesc ?? null,
      attachments: synopsis.synopsisAttachmentFolders ?? null,
      responseDateDesc: synopsis.responseDateDesc ?? null,
      postingDate: synopsis.postingDate ?? null,
      archiveDate: synopsis.archiveDate ?? null,
    };

    const currentAsOf = parseFederalDateMMDDYYYY(synopsis.lastUpdatedDate);
    const url = synopsis.fundingDescLinkUrl ?? synopsis.synopsisURL ?? null;
    const closeDate = parseFederalDateMMDDYYYY(synopsis.closeDate);
    const { status, closedAt } = normalizeOppStatusToGrantStatus(synopsis.oppStatus, closeDate, new Date());

    const beforeDetails = null;

    await prisma.$transaction(async (tx) => {
      if (grant.details) {
        await tx.grantDetail.update({
          where: { grantId },
          data: {
            title,
            purpose: purpose || title,
            description,
            eligibilityRequirements,
            fundingDetails,
          },
        });
      } else {
        await tx.grantDetail.create({
          data: {
            title,
            purpose: purpose || title,
            description,
            eligibilityRequirements,
            fundingDetails,
            grantId,
          },
        });
      }

      await tx.grant.update({
        where: { id: grantId },
        data: {
          url: url ?? grant.url,
          currentAsOf: currentAsOf ?? grant.currentAsOf,
          status,
          closedAt: status === $Enums.GrantStatus.CLOSED ? closedAt ?? closeDate ?? grant.closedAt : null,
          lastSeenAt: new Date(),
        },
      });
    });

    const afterDetails = {
      description,
      eligibilityRequirements,
      fundingDetails,
    };

    const diff = diffObjects(beforeDetails, afterDetails) ?? {};
    if (url) diff.url = { before: grant.url, after: url };
    if (currentAsOf) diff.currentAsOf = { before: grant.currentAsOf, after: currentAsOf };
    if (grant.status !== status) diff.status = { before: grant.status, after: status };

    await prisma.grantChange.create({
      data: {
        grantId,
        runId: run.id,
        changeType: 'DETAILS_FETCHED',
        oldHash: grant.contentHash ?? undefined,
        newHash: grant.contentHash ?? undefined,
        diffJson: Object.keys(diff).length ? (diff as Prisma.InputJsonValue) : Prisma.JsonNull,
        observedAt: new Date(),
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
    await prisma.grantSyncRun.update({
      where: { id: run.id },
      data: {
        status: $Enums.ImportStatus.FAILED,
        finishedAt: new Date(),
        errorsJson: [{ message }] as Prisma.InputJsonValue,
      },
    });
    return { fetched: false, error: message };
  }
}
