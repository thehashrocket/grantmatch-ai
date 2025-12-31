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

const DEFAULT_RESOURCE_ID =
	process.env.CA_CKAN_RESOURCE_ID ?? '111c8c88-21f6-453c-ae2c-b4785a0624f5';
const DEFAULT_LIMIT = parseInt(process.env.CA_CKAN_LIMIT ?? '500', 10) || 500;
const DEFAULT_BASE_URL =
	process.env.CA_CKAN_BASE_URL ??
	'https://data.ca.gov/api/3/action/datastore_search';
const RETRY_DELAYS = [500, 1500, 3500];

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
	name: 'California CKAN',
	async getSchema() {
		return {
			transport: 'CKAN',
			baseUrl: DEFAULT_BASE_URL,
			resourceId: DEFAULT_RESOURCE_ID,
			limit: DEFAULT_LIMIT,
		};
	},
	async *getRecords() {
		let offset = 0;
		let total = Number.POSITIVE_INFINITY;
		const limit = DEFAULT_LIMIT;

		while (offset < total) {
			const { records, total: pageTotal } = await fetchCkanPage({
				offset,
				limit,
			});

			if (typeof pageTotal === 'number') {
				total = pageTotal;
			}

			if (!records.length) break;

			for (const record of records) {
				const normalized: Record<string, string> = {};
				for (const [key, value] of Object.entries(record)) {
					normalized[key] = value == null ? '' : String(value);
				}
				yield normalized;
			}

			offset += limit;
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
		const awardPeriod = normalizeString(
			pickField(record, candidates.awardPeriod),
		);
		const expectedAwardDate = normalizeString(
			pickField(record, candidates.expectedAwardDate),
		);
		const awardStats = normalizeString(
			pickField(record, candidates.awardStats),
		);

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
	const str = String(value).replace(/[$,]/g, '').trim();
	if (!str) return null;
	const num = Number(str);
	return Number.isFinite(num) ? num : null;
}

type CkanResult = {
	records?: Record<string, unknown>[];
	total?: number;
};

async function fetchCkanPage({
	offset,
	limit,
}: {
	offset: number;
	limit: number;
}): Promise<{ records: Record<string, unknown>[]; total?: number }> {
	const url = new URL(DEFAULT_BASE_URL);
	url.searchParams.set('resource_id', DEFAULT_RESOURCE_ID);
	url.searchParams.set('limit', String(limit));
	url.searchParams.set('offset', String(offset));

	for (let attempt = 0; attempt < RETRY_DELAYS.length + 1; attempt++) {
		try {
			const res = await fetch(url.toString(), { method: 'GET' });

			if (res.status === 429 || res.status >= 500) {
				if (attempt < RETRY_DELAYS.length) {
					await delay(RETRY_DELAYS[attempt]);
					continue;
				}
			}

			if (!res.ok) {
				const text = await res.text().catch(() => '');
				throw new Error(
					`CKAN request failed (${res.status}): ${text.slice(0, 200)}`,
				);
			}

			const payload = (await res.json()) as {
				success?: boolean;
				result?: CkanResult;
			};

			if (!payload?.success || !payload.result) {
				throw new Error('CKAN response missing result');
			}

			return {
				records: payload.result.records ?? [],
				total: payload.result.total,
			};
		} catch (error) {
			if (attempt < RETRY_DELAYS.length) {
				await delay(RETRY_DELAYS[attempt]);
				continue;
			}
			throw error;
		}
	}

	return { records: [], total: undefined };
}

function delay(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
