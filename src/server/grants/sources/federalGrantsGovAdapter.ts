import {
	computeContentHash,
	normalizeString,
} from '@/server/grants/ingest/normalize';
import type { GrantSourceAdapter } from '@/server/grants/ingest/types';
import {
	normalizeOppStatusToGrantStatus,
	parseFederalDateMMDDYYYY,
	postJsonWithRetry,
} from '@/server/grants/sources/federalClient';
import { $Enums } from '@/prisma/generated/client';

type OppHit = {
	id?: string;
	number?: string;
	title?: string;
	agencyCode?: string;
	agency?: string;
	openDate?: string;
	closeDate?: string;
	oppStatus?: string;
	cfdaList?: string[];
	awardFloor?: string;
	awardCeiling?: string;
};

const SEARCH_URL = 'https://micro.grants.gov/rest/opportunities/search';
const DEFAULT_ROWS =
	parseInt(process.env.FEDERAL_GRANTS_ROWS ?? '200', 10) || 200;
const DEFAULT_ELIG = process.env.FEDERAL_GRANTS_ELIGIBILITIES ?? '12|13';
const DEFAULT_STATUSES =
	process.env.FEDERAL_GRANTS_OPP_STATUSES ??
	'posted|forecasted|closed|archived';

export const federalGrantsGovAdapter: GrantSourceAdapter = {
	source: $Enums.GrantSource.FEDERAL,
	name: 'grants.gov (micro.grants.gov index)',
	async getSchema() {
		return {
			searchUrl: SEARCH_URL,
			rows: DEFAULT_ROWS,
			eligibilities: DEFAULT_ELIG,
			oppStatuses: DEFAULT_STATUSES,
		};
	},
	async getPage(cursor) {
		const startRecordNum = Number.isFinite(cursor as number)
			? Number(cursor)
			: 0;
		const rows = DEFAULT_ROWS;
		const body = {
			keyword: null,
			cfda: null,
			agencies: null,
			sortBy: 'openDate|desc',
			rows,
			eligibilities: DEFAULT_ELIG,
			fundingCategories: null,
			fundingInstruments: null,
			dateRange: '',
			oppStatuses: DEFAULT_STATUSES,
			startRecordNum,
		};

		const res = await postJsonWithRetry<{
			hitCount?: number;
			startRecord?: number;
			oppHits?: OppHit[];
		}>(SEARCH_URL, body);
		const total = res.hitCount ?? 0;
		const hits = res.oppHits ?? [];
		const nextCursor = startRecordNum + rows;
		const done = hits.length === 0 || nextCursor >= total;
		return {
			records: hits as Record<string, unknown>[],
			nextCursor: done ? null : nextCursor,
			done,
		};
	},
	async *getRecords() {
		let cursor: unknown = 0;
		let done = false;
		while (!done) {
			const page = await this.getPage(cursor);
			for (const hit of page.records) {
				yield hit;
			}
			done = !!page.done;
			cursor = page.nextCursor ?? null;
		}
	},
	mapRecord(raw) {
		const hit = raw as OppHit;
		const id = hit.id ? String(hit.id) : undefined;
		const number = normalizeString(hit.number);
		const title = normalizeString(hit.title) ?? number ?? String(id);
		const agency = normalizeString(hit.agency) ?? 'Grants.gov';
		if (!id || !title || !agency) return null;

		const agencyCode = normalizeString(hit.agencyCode);
		const openDate = parseFederalDateMMDDYYYY(hit.openDate);
		const deadline = parseFederalDateMMDDYYYY(hit.closeDate);

		const { status, closedAt } = normalizeOppStatusToGrantStatus(
			hit.oppStatus,
			deadline,
			new Date(),
		);

		const awardFloor = toBigInt(hit.awardFloor);
		const awardCeiling = toBigInt(hit.awardCeiling);

		const url = `https://www.grants.gov/search-results-detail/${encodeURIComponent(hit.number ?? id)}`;

		const contentHash = computeContentHash({
			title,
			url,
			grantor: agency,
			agencyCode,
			openDate: openDate?.toISOString() ?? null,
			deadline: deadline?.toISOString() ?? null,
			number,
			cfdaList: hit.cfdaList ?? [],
			awardFloor: awardFloor?.toString() ?? null,
			awardCeiling: awardCeiling?.toString() ?? null,
		});

		return {
			source: $Enums.GrantSource.FEDERAL,
			sourceRecordId: id,
			sourceKey: undefined,
			number: number ?? undefined,
			url,
			title,
			grantor: agency,
			agencyCode: agencyCode ?? undefined,
			openDate: openDate ?? undefined,
			deadline: deadline ?? undefined,
			cfdaList: hit.cfdaList ?? undefined,
			awardFloor: awardFloor ?? undefined,
			awardCeiling: awardCeiling ?? undefined,
			status: status as $Enums.GrantStatus,
			closedAt,
			contentHash,
			lastSeenAt: new Date(),
		};
	},
};

function toBigInt(value?: string | null): bigint | null {
	if (!value) return null;
	const norm = value.trim().toLowerCase();
	if (norm === 'none' || norm === '') return null;
	const num = parseFloat(norm.replace(/,/g, ''));
	if (Number.isNaN(num)) return null;
	return BigInt(Math.trunc(num));
}
