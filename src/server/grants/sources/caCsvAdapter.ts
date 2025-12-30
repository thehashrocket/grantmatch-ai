import fs from 'node:fs';
import path from 'node:path';

import {
  computeContentHash,
  computeSourceKey,
  computeStatus,
  normalizeList,
  normalizeString,
  parseDateLoose,
  pickField,
} from '@/server/grants/ingest/normalize';
import { type GrantSourceAdapter } from '@/server/grants/ingest/types';
import { $Enums } from '@/prisma/generated/client';

const FILE_NAME = 'california-grants-portal-data.csv';

const candidates = {
  sourceRecordId: ['opportunity_id', 'grant_id', 'portal_id', 'portalId', 'record_id', '_id', 'id', 'PortalID'],
  title: ['Title', 'title', 'opportunity_title', 'name'],
  url: ['GrantURL', 'url', 'link', 'details_url', 'application_url'],
  grantor: ['AgencyDept', 'agency', 'department', 'state_agency', 'grantor'],
  purpose: ['Purpose', 'purpose', 'summary', 'short_description'],
  description: ['Description', 'details', 'description', 'full_description', 'grant_description'],
  eligibleApplicants: ['ApplicantType', 'eligible_applicants', 'eligibility', 'applicants'],
  eligibleGeographies: ['Geography', 'eligible_geographies', 'geography', 'locations'],
  openDate: ['OpenDate', 'open_date', 'start_date', 'posted_date'],
  deadline: ['ApplicationDeadline', 'close_date', 'deadline', 'end_date', 'due_date'],
  opportunityType: ['Type', 'opportunity_type', 'type'],
  currentAsOf: ['LastUpdated', 'last_updated', 'updated_at', 'current_as_of'],
  status: ['Status', 'status', 'opportunity_status', 'grant_status'],
};

export const caCsvAdapter: GrantSourceAdapter = {
  source: $Enums.GrantSource.CALIFORNIA,
  name: 'California CSV (legacy)',
  async *getRecords() {
    const filePath = path.join(process.cwd(), 'source_files', FILE_NAME);
    const content = await fs.promises.readFile(filePath, 'utf8');
    const rows = parseCsv(content);
    if (!rows.length) return;
    const headers = rows[0].map((h) => h.trim());
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length === 1 && row[0].trim() === '') continue;
      const record: Record<string, unknown> = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx];
      });
      yield record;
    }
  },
  mapRecord(record) {
    const sourceRecordIdRaw = normalizeString(pickField(record, candidates.sourceRecordId));
    const title = normalizeString(pickField(record, candidates.title));
    const url = normalizeString(pickField(record, candidates.url));
    const grantor = normalizeString(pickField(record, candidates.grantor));
    if (!title || !url || !grantor) return null;

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

    const portalIdCandidate = normalizeString(pickField(record, ['PortalID', 'portal_id', 'portalId']));
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

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        i++;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      row.push(current);
      current = '';
      continue;
    }
    if (char === '\r') continue;
    if (char === '\n') {
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      continue;
    }
    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  return rows;
}

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
