import { createHash } from 'node:crypto';

import { parseDateFlexible } from '@/lib/utils';
import { $Enums } from '@/prisma/generated/client';
import { z } from 'zod';

const candidateLists = {
	sourceRecordId: [
		'opportunity_id',
		'grant_id',
		'portal_id',
		'portalId',
		'record_id',
		'_id',
		'id',
	],
	title: ['title', 'opportunity_title', 'name'],
	url: ['url', 'link', 'details_url', 'application_url'],
	grantor: ['agency', 'department', 'state_agency', 'grantor'],
	purpose: ['purpose', 'summary', 'short_description'],
	description: [
		'details',
		'description',
		'full_description',
		'grant_description',
	],
	eligibleApplicants: ['eligible_applicants', 'eligibility', 'applicants'],
	eligibleGeographies: ['eligible_geographies', 'geography', 'locations'],
	openDate: ['open_date', 'start_date', 'posted_date'],
	deadline: ['close_date', 'deadline', 'end_date', 'due_date'],
	opportunityType: ['opportunity_type', 'type'],
	currentAsOf: ['last_updated', 'updated_at', 'current_as_of'],
	status: ['status', 'opportunity_status', 'grant_status'],
};

export const normalizedGrantSchema = z.object({
	source: z.enum($Enums.GrantSource),
	sourceRecordId: z.string().optional(),
	sourceKey: z.string().optional(),
	title: z.string().min(1),
	url: z.url(),
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
	portalId: z.number().int().optional().nullable(),
	status: z.enum($Enums.GrantStatus),
	closedAt: z.date().optional().nullable(),
	contentHash: z.string(),
	lastSeenAt: z.date(),
});

export type NormalizedGrant = z.infer<typeof normalizedGrantSchema>;

export type NormalizeResult = {
	grant: NormalizedGrant;
	rawStatus?: string;
};

export function pickField(
	record: Record<string, unknown>,
	candidates: string[],
): unknown {
	for (const key of candidates) {
		if (
			record[key] !== undefined &&
			record[key] !== null &&
			String(record[key]).trim() !== ''
		) {
			return record[key];
		}
	}
	return undefined;
}

function normalizeString(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const str = String(value).replace(/\s+/g, ' ').trim();
	return str.length ? str : undefined;
}

function normalizeList(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	const str = String(value);
	const parts = str
		.split(/[,;]+/)
		.map((item) => normalizeString(item))
		.filter((item): item is string => Boolean(item));
	return parts.length ? parts : undefined;
}

function normalizeDate(value: unknown): Date | undefined {
	if (value === undefined || value === null) return undefined;
	const parsed = parseDateFlexible(String(value));
	return parsed ?? undefined;
}

function computeSourceKey(
	fields: Array<string | number | undefined | null>,
): string {
	const canonical = fields
		.map((field) =>
			field === undefined || field === null
				? ''
				: String(field).trim().toLowerCase(),
		)
		.join('|');
	return sha256(canonical);
}

function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function computeContentHash(fields: Record<string, unknown>): string {
	const serialized = JSON.stringify(fields, Object.keys(fields).sort());
	return sha256(serialized);
}

export function computeStatus(
	deadline: Date | undefined,
	rawStatus?: string,
): { status: $Enums.GrantStatus; closedAt: Date | null } {
	const now = new Date();
	const norm = rawStatus?.toLowerCase() ?? '';
	const isClosedByText = ['closed', 'inactive', 'expired'].some((marker) =>
		norm.includes(marker),
	);
	const isClosedByDate = !!deadline && deadline.getTime() < now.getTime();

	if (isClosedByText || isClosedByDate) {
		return { status: $Enums.GrantStatus.CLOSED, closedAt: deadline ?? now };
	}

	if (
		['open', 'posted', 'forecasted', 'upcoming', 'active'].some((marker) =>
			norm.includes(marker),
		)
	) {
		return { status: $Enums.GrantStatus.OPEN, closedAt: null };
	}

	// Prefer OPEN when in doubt
	return { status: $Enums.GrantStatus.OPEN, closedAt: null };
}

export function normalizeCaliforniaRecord(
	record: Record<string, unknown>,
): NormalizeResult | null {
	const rawSourceRecordId = normalizeString(
		pickField(record, candidateLists.sourceRecordId),
	);
	const title = normalizeString(pickField(record, candidateLists.title));
	const url = normalizeString(pickField(record, candidateLists.url));
	const grantor = normalizeString(pickField(record, candidateLists.grantor));

	if (!title || !url || !grantor) return null;

	const stateAgency =
		normalizeString(pickField(record, candidateLists.grantor)) ?? undefined;
	const purpose = normalizeString(pickField(record, candidateLists.purpose));
	const description = normalizeString(
		pickField(record, candidateLists.description),
	);
	const eligibleApplicants = normalizeList(
		pickField(record, candidateLists.eligibleApplicants),
	);
	const eligibleGeographies = normalizeString(
		pickField(record, candidateLists.eligibleGeographies),
	);
	const openDate = normalizeDate(pickField(record, candidateLists.openDate));
	const deadline = normalizeDate(pickField(record, candidateLists.deadline));
	const opportunityType = normalizeString(
		pickField(record, candidateLists.opportunityType),
	);
	const currentAsOf = normalizeDate(
		pickField(record, candidateLists.currentAsOf),
	);
	const rawStatus = normalizeString(pickField(record, candidateLists.status));

	const portalIdCandidate = normalizeString(
		pickField(record, ['portal_id', 'portalId', 'PortalID']),
	);
	const portalId =
		portalIdCandidate && /^\d+$/.test(portalIdCandidate)
			? parseInt(portalIdCandidate, 10)
			: null;

	const sourceRecordId = rawSourceRecordId ?? undefined;
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

	const grant: NormalizedGrant = {
		source: $Enums.GrantSource.CALIFORNIA,
		sourceRecordId: sourceRecordId ?? undefined,
		sourceKey,
		title,
		url,
		grantor,
		stateAgency,
		purpose,
		description,
		eligibleApplicants,
		eligibleGeographies,
		openDate,
		deadline,
		opportunityType,
		currentAsOf: currentAsOf ?? undefined,
		portalId,
		status,
		closedAt,
		contentHash,
		lastSeenAt: new Date(),
	};

	return { grant, rawStatus };
}

export function diffFields(
	before: Partial<NormalizedGrant> | null,
	after: Partial<NormalizedGrant>,
): Record<string, { old: unknown; new: unknown }> | null {
	if (!before) return null;
	const diff: Record<string, { old: unknown; new: unknown }> = {};
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	keys.forEach((key) => {
		const oldVal = (before as Record<string, unknown>)[key];
		const newVal = (after as Record<string, unknown>)[key];
		if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			diff[key] = { old: oldVal, new: newVal };
		}
	});
	return Object.keys(diff).length ? diff : null;
}

export function diffObjects(
	before: Record<string, unknown> | null,
	after: Record<string, unknown>,
): Record<string, { old: unknown; new: unknown }> | null {
	if (!before) return null;
	const diff: Record<string, { old: unknown; new: unknown }> = {};
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	keys.forEach((key) => {
		const oldVal = before[key];
		const newVal = after[key];
		if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			diff[key] = { old: oldVal, new: newVal };
		}
	});
	return Object.keys(diff).length ? diff : null;
}
