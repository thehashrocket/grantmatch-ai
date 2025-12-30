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
import type { GrantSourceAdapter } from '@/server/grants/ingest/types';
import { $Enums } from '@/prisma/generated/client';

const FILE_NAME = 'california-grants-portal-data.csv';

const candidates = {
	sourceRecordId: [
		'opportunity_id',
		'grant_id',
		'portal_id',
		'portalId',
		'record_id',
		'_id',
		'id',
		'PortalID',
	],
	title: ['Title', 'title', 'opportunity_title', 'name'],
	url: ['GrantURL', 'url', 'link', 'details_url', 'application_url'],
	grantor: ['AgencyDept', 'agency', 'department', 'state_agency', 'grantor'],
	purpose: ['Purpose', 'purpose', 'summary', 'short_description'],
	description: [
		'Description',
		'details',
		'description',
		'full_description',
		'grant_description',
	],
	eligibleApplicants: [
		'ApplicantType',
		'eligible_applicants',
		'eligibility',
		'applicants',
	],
	eligibleGeographies: [
		'Geography',
		'eligible_geographies',
		'geography',
		'locations',
	],
	openDate: ['OpenDate', 'open_date', 'start_date', 'posted_date'],
	deadline: [
		'ApplicationDeadline',
		'close_date',
		'deadline',
		'end_date',
		'due_date',
	],
	opportunityType: ['Type', 'opportunity_type', 'type'],
	currentAsOf: ['LastUpdated', 'last_updated', 'updated_at', 'current_as_of'],
	status: ['Status', 'status', 'opportunity_status', 'grant_status'],
	estimatedTotalFunding: ['EstAvailFunds', 'est_avail_funds'],
	estimatedAwardAmounts: ['EstAmounts', 'est_amounts'],
	expectedNumberOfAwards: ['EstAwards', 'est_awards'],
	fundingMethod: ['FundingMethod', 'funding_method'],
	fundingMethodNotes: ['FundingMethodNotes', 'funding_method_notes'],
	matchFunding: ['MatchingFunds', 'matching_funds'],
	matchFundingNotes: ['MatchingFundsNotes', 'matching_funds_notes'],
	fundingSource: ['FundingSource', 'funding_source'],
	fundingSourceNotes: ['FundingSourceNotes', 'funding_source_notes'],
	letterOfIntentRequired: ['LOI', 'loi_required'],
	awardPeriod: ['AwardPeriod', 'award_period'],
	expectedAwardDate: ['ExpAwardDate', 'expected_award_date'],
	awardStats: ['AwardStats', 'award_stats'],
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
		const sourceRecordIdRaw = normalizeString(
			pickField(record, candidates.sourceRecordId),
		);
		const title = normalizeString(pickField(record, candidates.title));
		const url = normalizeString(pickField(record, candidates.url));
		const grantor = normalizeString(pickField(record, candidates.grantor));
		if (!title || !url || !grantor) return null;

		const stateAgency = normalizeString(pickField(record, candidates.grantor));
		const purpose = normalizeString(pickField(record, candidates.purpose));
		const description = normalizeString(
			pickField(record, candidates.description),
		);
		const eligibleApplicants = normalizeList(
			pickField(record, candidates.eligibleApplicants),
		);
		const eligibleGeographies = normalizeString(
			pickField(record, candidates.eligibleGeographies),
		);
		const openDate = parseDateLoose(pickField(record, candidates.openDate));
		const deadline = parseDateLoose(pickField(record, candidates.deadline));
		const opportunityType = normalizeString(
			pickField(record, candidates.opportunityType),
		);
		const currentAsOf = parseDateLoose(
			pickField(record, candidates.currentAsOf),
		);
		const rawStatus = normalizeString(pickField(record, candidates.status));
		const estimatedTotalFunding = parseCurrency(
			pickField(record, candidates.estimatedTotalFunding),
		);
		const estimatedAwardAmounts = normalizeString(
			pickField(record, candidates.estimatedAwardAmounts),
		);
		const expectedNumberOfAwards = parseCurrency(
			pickField(record, candidates.expectedNumberOfAwards),
		);
		const matchFunding = normalizeString(
			pickField(record, candidates.matchFunding),
		);
		const matchFundingNotes = normalizeString(
			pickField(record, candidates.matchFundingNotes),
		);
		const fundsDisbursement = normalizeString(
			pickField(record, candidates.fundingMethod),
		);
		const fundsDisbursementNotes = normalizeString(
			pickField(record, candidates.fundingMethodNotes),
		);
		const fundingSource = normalizeString(
			pickField(record, candidates.fundingSource),
		);
		const fundingSourceNotes = normalizeString(
			pickField(record, candidates.fundingSourceNotes),
		);
		const letterOfIntentRequired = normalizeString(
			pickField(record, candidates.letterOfIntentRequired),
		);
		const awardPeriod = normalizeString(pickField(record, candidates.awardPeriod));
		const expectedAwardDate = normalizeString(
			pickField(record, candidates.expectedAwardDate),
		);
		const awardStats = normalizeString(pickField(record, candidates.awardStats));

		const portalIdCandidate = normalizeString(
			pickField(record, ['PortalID', 'portal_id', 'portalId']),
		);
		const portalId =
			portalIdCandidate && /^\d+$/.test(portalIdCandidate)
				? parseInt(portalIdCandidate, 10)
				: null;

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
			matchFunding,
			estimatedTotalFunding,
			estimatedAwardAmounts,
			expectedNumberOfAwards,
			fundingSource,
			fundingSourceNotes,
			fundsDisbursement,
			fundsDisbursementNotes,
			letterOfIntentRequired,
			awardPeriod,
			expectedAwardDate,
			awardStats,
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
			matchFunding,
			estimatedTotalFunding,
			estimatedAwardAmounts,
			fundsDisbursment: fundsDisbursement,
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
				currentAsOf,
				matchFunding,
				matchFundingNotes,
				fundsDisbursement,
				fundsDisbursementNotes,
				fundingSource,
				fundingSourceNotes,
				estimatedTotalFunding,
				estimatedAwardAmounts,
				expectedNumberOfAwards,
				letterOfIntentRequired,
				awardPeriod,
				expectedAwardDate,
				awardStats,
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
	currentAsOf,
	matchFunding,
	matchFundingNotes,
	fundsDisbursement,
	fundsDisbursementNotes,
	fundingSource,
	fundingSourceNotes,
	estimatedTotalFunding,
	estimatedAwardAmounts,
	expectedNumberOfAwards,
	letterOfIntentRequired,
	awardPeriod,
	expectedAwardDate,
	awardStats,
	record,
}: {
	title: string;
	purpose?: string;
	description?: string;
	eligibleApplicants?: string[];
	eligibleGeographies?: string;
	currentAsOf?: Date | null;
	matchFunding?: string;
	matchFundingNotes?: string;
	fundsDisbursement?: string;
	fundsDisbursementNotes?: string;
	fundingSource?: string;
	fundingSourceNotes?: string;
	estimatedTotalFunding?: number | null;
	estimatedAwardAmounts?: string;
	expectedNumberOfAwards?: number | null;
	letterOfIntentRequired?: string;
	awardPeriod?: string;
	expectedAwardDate?: string;
	awardStats?: string;
	record: Record<string, unknown>;
}) {
	const applicantTypeNotes = normalizeString(record.ApplicantTypeNotes);
	const grantEventsUrl = normalizeString(record.GrantEventsURL);
	const contactInfo = normalizeString(record.ContactInfo);
	const applicationUrl = normalizeString(record.GrantURL);
	const agencyUrl = normalizeString(record.AgencyURL);

	const eligibilityRequirements = {
		eligibleApplicants,
		eligibleGeographies,
		applicantTypeNotes,
		eligibilityText:
			normalizeString(record.Eligibility) ??
			normalizeString(record.Description),
	};

	const fundingDetails = {
		fundingSource,
		fundingSourceNotes,
		estimatedTotalFunding,
		estimatedAwardAmounts,
		matchFunding,
		matchFundingNotes,
		expectedNumberOfAwards:
			expectedNumberOfAwards !== null ? expectedNumberOfAwards : undefined,
		fundsDisbursement,
		fundsDisbursementNotes,
		grantEventsUrl,
		contactInfo,
		applicationUrl,
		agencyUrl,
		letterOfIntentRequired,
		awardPeriod,
		expectedAwardDate,
		awardStats,
	};

	return {
		title,
		purpose: purpose ?? title,
		description: description ?? '',
		eligibilityRequirements,
		fundingDetails,
		fetchedAt: currentAsOf ?? new Date(),
	};
}

function parseCurrency(value: unknown): number | null {
	if (value === undefined || value === null) return null;
	const str = String(value).replace(/[\$,]/g, '').trim();
	if (!str) return null;
	const num = Number(str);
	return Number.isFinite(num) ? num : null;
}
