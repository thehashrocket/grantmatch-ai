import type { Prisma, Grant } from '@/prisma/generated/client';
import {
	mapFederalApply07,
	type FederalDetails,
	type FederalSynopsis,
} from '@/server/grants/details/mappers/mapFederalApply07';
import type { GrantDetailsResult } from '@/server/grants/details/types';
import { parseFederalDateMMDDYYYY } from '@/server/grants/sources/federalClient';

type Aln = {
	id?: string | number | null;
	opportunityId?: string | number | null;
	alnNumber?: string | null;
	programTitle?: string | null;
};

export type FederalFetchOpportunityResponse = {
	errorcode?: number;
	msg?: string;
	token?: string;
	data?: FederalFetchOpportunityData | null;
};

type FederalFetchOpportunityData = FederalDetails & {
	[key: string]: unknown;
	// Root-level fields present in the fetchOpportunity payload
	id?: number | string;
	revision?: unknown;
	opportunityNumber?: string | null;
	owningAgencyCode?: string | null;
	listed?: string | null;
	publisherUid?: string | null;
	flag2006?: string | null;
	opportunityCategory?: {
		category?: string | null;
		description?: string | null;
	};
	synopsisAttachmentFolders?: unknown;
	synopsisDocumentURLs?: unknown;
	synAttChangeComments?: unknown;
	alns?: Aln[] | null;
	opportunityHistoryDetails?: unknown;
	opportunityPkgs?: unknown;
	closedOpportunityPkgs?: unknown;
	originalDueDateDesc?: string | null;
	synopsisModifiedFields?: unknown;
	forecastModifiedFields?: unknown;
	assistCompatible?: boolean;
	assistURL?: string | null;
	relatedOpps?: unknown;
	docType?: string | null;
	agencyDetails?: {
		agencyName?: string | null;
		code?: string | null;
		seed?: string | null;
		agencyCode?: string | null;
		topAgencyCode?: string | null;
	} | null;
	topAgencyDetails?: {
		agencyName?: string | null;
		code?: string | null;
		seed?: string | null;
		agencyCode?: string | null;
		topAgencyCode?: string | null;
	} | null;
};

type FederalFetchOpportunitySynopsis = FederalSynopsis & {
	awardCeiling?: unknown;
	awardCeilingFormatted?: unknown;
	awardFloor?: unknown;
	awardFloorFormatted?: unknown;
	costSharing?: unknown;
	agencyName?: string | null;
	agencyCode?: string | null;
	postingDateStr?: string | null;
	createTimeStamp?: string | null;
	createdDate?: string | null;
	lastUpdatedDate?: string | null;
	synopsisAttachmentFolders?: unknown;
	synopsisDocumentURLs?: unknown;
	synAttChangeComments?: unknown;
};

function toBigInt(value: unknown): bigint | null {
	if (value == null) return null;
	const str = String(value).trim();
	if (!str) return null;
	const cleaned = str.replace(/,/g, '');
	const num = Number(cleaned);
	if (!Number.isFinite(num)) return null;
	return BigInt(Math.trunc(num));
}

function parseDateFlexible(value: unknown): Date | null {
	if (value == null) return null;
	const str = String(value).trim();
	const mmdd = parseFederalDateMMDDYYYY(str);
	if (mmdd) return mmdd;

	// Handle formats like 2023-10-11-00-00-00
	const dashedParts = str.split('-');
	if (dashedParts.length === 6) {
		const [y, m, d, hh, mm, ss] = dashedParts;
		const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:${ss.padStart(2, '0')}Z`;
		const parsed = new Date(iso);
		if (!Number.isNaN(parsed.getTime())) return parsed;
	}

	const parsed = new Date(str);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function pickString(
	...candidates: (string | null | undefined)[]
): string | null {
	for (const candidate of candidates) {
		if (candidate?.trim()) return candidate.trim();
	}
	return null;
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
	if (value === undefined) return undefined;
	return value as Prisma.InputJsonValue;
}

function extractCfdaList(alns: Aln[] | null | undefined): string[] | undefined {
	if (!Array.isArray(alns)) return undefined;
	const ids = alns
		.map((aln) => (aln?.alnNumber ? String(aln.alnNumber) : null))
		.filter((aln): aln is string => !!aln);
	return ids.length ? ids : undefined;
}

function buildFundingDetails(
	base: Prisma.InputJsonValue | undefined,
	extras: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
	const merged = {
		...(base as Record<string, unknown> | undefined),
		...extras,
	};
	return Object.values(merged).every((value) => value == null)
		? undefined
		: (merged as Prisma.InputJsonValue);
}

export function mapFederalFetchOpportunity(
	response: FederalFetchOpportunityResponse,
	grant: Grant,
): GrantDetailsResult {
	const data = (response?.data ?? {}) as FederalFetchOpportunityData;
	const rootFolders = data.synopsisAttachmentFolders;
	const nestedFolders = (
		data.synopsis as FederalFetchOpportunitySynopsis | undefined
	)?.synopsisAttachmentFolders;
	const synopsisAttachmentFolders =
		Array.isArray(rootFolders) && rootFolders.length
			? rootFolders
			: (nestedFolders ?? rootFolders ?? []);
	const synopsis = {
		...(data.synopsis as FederalFetchOpportunitySynopsis | undefined),
		opportunityCategory:
			(data.synopsis as FederalFetchOpportunitySynopsis | undefined)
				?.opportunityCategory ?? data.opportunityCategory,
		synopsisAttachmentFolders: synopsisAttachmentFolders as unknown,
	} as FederalFetchOpportunitySynopsis;

	const detailsForApply07: FederalDetails = {
		synopsis,
		opportunityTitle: data.opportunityTitle ?? undefined,
		applicantTypes: data.applicantTypes,
		applicantEligibilityDesc: data.applicantEligibilityDesc,
		eligibilityDescription: data.eligibilityDescription,
		fundingActivityCategory: (
			data as { fundingActivityCategory?: { description?: string } }
		).fundingActivityCategory,
		fundingDescLinkUrl: (data as { fundingDescLinkUrl?: string })
			.fundingDescLinkUrl,
		synopsisURL: (data as { synopsisURL?: string }).synopsisURL,
	};

	const base = mapFederalApply07(detailsForApply07, grant);

	const awardCeiling = toBigInt(
		synopsis.awardCeiling ?? synopsis.awardCeilingFormatted,
	);
	const awardFloor = toBigInt(
		synopsis.awardFloor ?? synopsis.awardFloorFormatted,
	);
	const cfdaList = extractCfdaList(data.alns);

	const openDate =
		parseDateFlexible(synopsis.postingDate) ??
		parseDateFlexible(synopsis.postingDateStr);
	const currentAsOf = parseDateFlexible(synopsis.lastUpdatedDate);

	const grantPatch: Prisma.GrantUncheckedUpdateInput = {
		...base.grantPatch,
		agencyCode:
			pickString(data.owningAgencyCode, synopsis.agencyCode ?? null) ??
			base.grantPatch?.agencyCode,
		awardCeiling: awardCeiling ?? base.grantPatch?.awardCeiling,
		awardFloor: awardFloor ?? base.grantPatch?.awardFloor,
		openDate: openDate ?? base.grantPatch?.openDate,
		currentAsOf: currentAsOf ?? base.grantPatch?.currentAsOf,
		cfdaList: cfdaList ?? (base.grantPatch?.cfdaList as Prisma.InputJsonValue),
		grantor:
			pickString(
				synopsis.agencyName ?? null,
				(data.agencyDetails as { agencyName?: string } | undefined)?.agencyName,
				(data.topAgencyDetails as { agencyName?: string } | undefined)
					?.agencyName,
			) ?? (base.grantPatch?.grantor as string | undefined),
	};

	if (!grant.number && data.opportunityNumber) {
		grantPatch.number = data.opportunityNumber;
	}

	const fundingDetails = buildFundingDetails(base.detail.fundingDetails, {
		awardCeiling: awardCeiling?.toString() ?? null,
		awardFloor: awardFloor?.toString() ?? null,
		costSharing: synopsis.costSharing ?? null,
		fundingActivityCategories:
			synopsis.fundingActivityCategories ??
			(base.detail.fundingDetails as Record<string, unknown> | undefined)
				?.fundingActivityCategories ??
			null,
		fundingInstruments:
			synopsis.fundingInstruments ??
			(base.detail.fundingDetails as Record<string, unknown> | undefined)
				?.fundingInstruments ??
			null,
		synopsisDocumentURLs: data.synopsisDocumentURLs ?? null,
		synAttChangeComments: data.synAttChangeComments ?? null,
		alns: data.alns ?? null,
		opportunityHistoryDetails: data.opportunityHistoryDetails ?? null,
		opportunityPkgs: data.opportunityPkgs ?? null,
		closedOpportunityPkgs: data.closedOpportunityPkgs ?? null,
		originalDueDateDesc: data.originalDueDateDesc ?? null,
		synopsisModifiedFields: data.synopsisModifiedFields ?? null,
		forecastModifiedFields: data.forecastModifiedFields ?? null,
		assistCompatible: data.assistCompatible ?? null,
		assistURL: data.assistURL ?? null,
		listed: data.listed ?? null,
		docType: data.docType ?? null,
	});

	return {
		detail: {
			...base.detail,
			title: base.detail.title ?? data.opportunityTitle ?? grant.title ?? null,
			purpose:
				base.detail.purpose ?? data.opportunityCategory?.description ?? null,
			fundingDetails,
			rawJson: toJsonValue(data),
		},
		attachments: base.attachments,
		grantPatch,
		raw: data,
	};
}
