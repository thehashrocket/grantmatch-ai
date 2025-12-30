import { fetchCkanPage, fetchCkanSchema, CKAN_PAGE_SIZE } from '@/server/grants/ckanClient';
import {
  computeContentHash,
  computeSourceKey,
  computeStatus,
  normalizeList,
  normalizeString,
  parseDateLoose,
  pickField,
} from '@/server/grants/ingest/normalize';
import type { GrantSourceAdapter } from '@/server/grants/ingest/types';
import { $Enums } from '@/prisma/generated/client';

const RESOURCE_ID = '111c8c88-21f6-453c-ae2c-b4785a0624f5';

const candidates = {
  sourceRecordId: ['opportunity_id', 'grant_id', 'portal_id', 'portalId', 'record_id', '_id', 'id', 'PortalID'],
  title: ['title', 'opportunity_title', 'name', 'Title'],
  url: ['url', 'link', 'details_url', 'application_url', 'GrantURL'],
  grantor: ['agency', 'department', 'state_agency', 'grantor', 'AgencyDept'],
  purpose: ['purpose', 'summary', 'short_description', 'Purpose'],
  description: ['details', 'description', 'full_description', 'grant_description', 'Description'],
  eligibleApplicants: ['eligible_applicants', 'eligibility', 'applicants', 'ApplicantType'],
  eligibleGeographies: ['eligible_geographies', 'geography', 'locations', 'Geography'],
  openDate: ['open_date', 'start_date', 'posted_date', 'OpenDate'],
  deadline: ['close_date', 'deadline', 'end_date', 'due_date', 'ApplicationDeadline'],
  opportunityType: ['opportunity_type', 'type', 'Type'],
  currentAsOf: ['last_updated', 'updated_at', 'current_as_of', 'LastUpdated'],
  status: ['status', 'opportunity_status', 'grant_status', 'Status'],
};

export const caCkanAdapter: GrantSourceAdapter = {
  source: $Enums.GrantSource.CALIFORNIA,
  name: 'California CKAN',
  async getSchema() {
    return fetchCkanSchema(RESOURCE_ID);
  },
  async *getRecords() {
    let offset = 0;
    let total = Number.MAX_SAFE_INTEGER;

    while (offset < total) {
      const page = await fetchCkanPage(RESOURCE_ID, offset, CKAN_PAGE_SIZE);
      total = page.total;
      for (const record of page.records) {
        yield record;
      }
      offset += CKAN_PAGE_SIZE;
    }
  },
  mapRecord(record) {
    const sourceRecordIdRaw = normalizeString(pickField(record, candidates.sourceRecordId));
    const title = normalizeString(pickField(record, candidates.title));
    const url = normalizeString(pickField(record, candidates.url));
    const grantor = normalizeString(pickField(record, candidates.grantor)) ?? 'California';
    if (!title || !url) return null;

    const stateAgency = normalizeString(pickField(record, candidates.grantor));
    const purpose = normalizeString(pickField(record, candidates.purpose));
    const description = normalizeString(pickField(record, candidates.description));
    const eligibleApplicants = normalizeList(pickField(record, candidates.eligibleApplicants));
    const eligibleGeographies = normalizeString(pickField(record, candidates.eligibleGeographies));
    const openDate = parseDateLoose(pickField(record, candidates.openDate));
    const deadline = parseDateLoose(pickField(record, candidates.deadline));
    const opportunityType = normalizeString(pickField(record, candidates.opportunityType));
    const currentAsOf = parseDateLoose(pickField(record, candidates.currentAsOf));
    const rawStatus = normalizeString(pickField(record, candidates.status));

    const portalIdCandidate = normalizeString(pickField(record, ['portal_id', 'portalId', 'PortalID']));
    const portalId = portalIdCandidate && /^\d+$/.test(portalIdCandidate) ? parseInt(portalIdCandidate, 10) : null;

    const sourceRecordId = sourceRecordIdRaw ?? undefined;
    const sourceKey =
      sourceRecordId === undefined
        ? computeSourceKey([
            title,
            url,
            grantor,
            openDate ? openDate.toISOString() : undefined,
            deadline ? deadline.toISOString() : undefined,
          ])
        : undefined;

    const { status, closedAt } = computeStatus(deadline, rawStatus);

    const contentHash = computeContentHash({
      title,
      url,
      grantor,
      stateAgency,
      purpose,
      description,
      eligibleApplicants,
      eligibleGeographies,
      openDate: openDate?.toISOString() ?? null,
      deadline: deadline?.toISOString() ?? null,
      opportunityType,
    });

    return {
      source: $Enums.GrantSource.CALIFORNIA,
      sourceRecordId,
      sourceKey,
      url,
      title,
      grantor,
      stateAgency,
      purpose,
      description,
      eligibleApplicants,
      eligibleGeographies,
      openDate,
      deadline,
      opportunityType,
      currentAsOf,
      portalId,
      status,
      closedAt,
      contentHash,
      lastSeenAt: new Date(),
      details: buildDetails({
        title,
        purpose,
        description,
        eligibleApplicants,
        eligibleGeographies,
        record,
      }),
    };
  },
};

function buildDetails({
  title,
  purpose,
  description,
  eligibleApplicants,
  eligibleGeographies,
  record,
}: {
  title: string;
  purpose?: string;
  description?: string;
  eligibleApplicants?: string[];
  eligibleGeographies?: string;
  record: Record<string, unknown>;
}) {
  const applicantTypeNotes = normalizeString(record.ApplicantTypeNotes);
  const matchFunding = normalizeString(record.MatchingFunds);
  const matchFundingNotes = normalizeString(record.MatchingFundsNotes);
  const fundsDisbursement = normalizeString(record.FundingMethod);
  const fundsDisbursementNotes = normalizeString(record.FundingMethodNotes);
  const estimatedTotalFunding = normalizeString(record.EstAvailFunds);
  const estimatedAwardAmounts = normalizeString(record.EstAmounts ?? record.EstAwards);
  const grantEventsUrl = normalizeString(record.GrantEventsURL);
  const contactInfo = normalizeString(record.ContactInfo);
  const applicationUrl = normalizeString(record.GrantURL);
  const agencyUrl = normalizeString(record.AgencyURL);

  const eligibilityRequirements = {
    eligibleApplicants,
    eligibleGeographies,
    applicantTypeNotes,
    eligibilityText: normalizeString(record.Eligibility) ?? normalizeString(record.Description),
  };

  const fundingDetails = {
    estimatedTotalFunding,
    estimatedAwardAmounts,
    matchFunding,
    matchFundingNotes,
    fundsDisbursement,
    fundsDisbursementNotes,
    grantEventsUrl,
    contactInfo,
    applicationUrl,
    agencyUrl,
  };

  return {
    title,
    purpose: purpose ?? title,
    description: description ?? '',
    eligibilityRequirements,
    fundingDetails,
  };
}
