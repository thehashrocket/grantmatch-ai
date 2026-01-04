// /src/lib/services/GrantImportService.ts

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

import { db } from '@/lib/db';
import {
	parseDateFlexible,
	parseFundingAmount,
	toSmartTitleCase,
} from '@/lib/utils';
import {
	calculateGrantFitScore,
	FIT_SCORE_VERSION,
} from '@/lib/utils/grant-scoring';
import { $Enums } from '@/prisma/generated/client';

type CaliforniaGrantInput = {
	url: string;
	title: string;
	deadline: string;
	openDate: string;
	stateAgency: string;
	matchFunding: string;
	estimatedTotalFunding: string;
	estimatedAwardAmounts: string;
	fundsDisbursement: string;
	currentAsOf: string;
	grantor: string;
	portalId: string | number;
	opportunityType: string;
	purpose: string;
	eligibleApplicants: string[];
	eligibleGeographies?: string;
	rawStatus?: string;
	sourceRecordId?: string;
	sourceKey?: string;
};

type FederalGrantInput = {
	url: string;
	title: string;
	number: string;
	openDate: string;
	closeDate: string;
	grantor: string;
	agencyCode: string;
	awardFloor: string;
	awardCeiling: string;
	cfdaList: string[];
	sourceRecordId?: string;
	sourceKey?: string;
};

type CaliforniaCsvRow = Record<string, string>;

type ImportResult = {
	processed: number;
	upserted: number;
	skipped: number;
};

const LAST_SEEN_THROTTLE_MS = 1000 * 60 * 60 * 24; // 24 hours

function shouldTouchLastSeen(existingLastSeenAt: Date | null): boolean {
	if (!existingLastSeenAt) return true;
	return Date.now() - existingLastSeenAt.getTime() > LAST_SEEN_THROTTLE_MS;
}

const CALIFORNIA_FILENAME = 'california-grants-portal-data.csv';

function mapToEnumType(value: string, validTypes: string[]): string {
	const normalized = value.trim().toUpperCase();
	if (validTypes.includes(normalized)) return normalized;
	if (['ONGOING', 'ROLLING', 'TBD', 'CLOSED', 'UNKNOWN'].includes(normalized))
		return normalized;
	return 'UNKNOWN';
}

function cleanValue(value?: string): string {
	if (!value) return '';
	return value.replace(/^\uFEFF/, '').trim();
}

function splitList(value?: string): string[] {
	if (!value) return [];
	return value
		.split(/;|,/)
		.map((entry) => cleanValue(entry))
		.filter(Boolean);
}

function combineValueWithNote(primary?: string, note?: string): string {
	const main = cleanValue(primary);
	const extra = cleanValue(note);
	if (main && extra) return `${main} (${extra})`;
	return main || extra;
}

function stableStringify(value: unknown): string {
	const seen = new WeakSet<object>();

	const normalize = (v: unknown): unknown => {
		if (v === undefined) return undefined;
		if (v === null) return null;

		if (v instanceof Date) return v.toISOString();
		if (typeof v === 'bigint') return v.toString();

		if (Array.isArray(v)) {
			return v.map((item) => normalize(item)).filter((x) => x !== undefined);
		}

		if (typeof v === 'object') {
			const obj = v as Record<string, unknown>;
			if (seen.has(obj)) {
				throw new Error('stableStringify: circular reference detected');
			}
			seen.add(obj);

			const keys = Object.keys(obj).sort();
			const out: Record<string, unknown> = {};
			for (const key of keys) {
				const normalized = normalize(obj[key]);
				if (normalized !== undefined) {
					out[key] = normalized;
				}
			}
			return out;
		}

		return v;
	};

	return JSON.stringify(normalize(value));
}

function computeContentHash(payload: Record<string, unknown>): string {
	const serialized = stableStringify(payload);
	return createHash('sha256').update(serialized).digest('hex');
}

function computeStatus(
	deadline: Date | null,
	rawStatus?: string,
): { status: $Enums.GrantStatus; closedAt: Date | null } {
	const now = new Date();
	const normalizedStatus = rawStatus?.toLowerCase() ?? '';
	const isExplicitlyClosed = ['closed', 'inactive', 'expired'].some((term) =>
		normalizedStatus.includes(term),
	);
	const isClosedByDate =
		deadline !== null && deadline.getTime() < now.getTime();

	if (isExplicitlyClosed || isClosedByDate) {
		return { status: $Enums.GrantStatus.CLOSED, closedAt: deadline ?? now };
	}

	if (
		['active', 'open', 'posted', 'forecasted', 'upcoming'].some((term) =>
			normalizedStatus.includes(term),
		)
	) {
		return { status: $Enums.GrantStatus.OPEN, closedAt: null };
	}

	return { status: $Enums.GrantStatus.UNKNOWN, closedAt: null };
}

function buildSourceKeyFromFields(
	fields: Array<string | number | null | undefined>,
): string {
	const canonical = fields
		.map((field) =>
			field === null || field === undefined
				? ''
				: String(field).trim().toLowerCase(),
		)
		.join('|');
	return createHash('sha256').update(canonical).digest('hex');
}

/**
 * Minimal CSV parser that honors quoted fields and newlines.
 */
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

class GrantImportService {
	async importFromFile(fileName: string): Promise<ImportResult> {
		if (fileName !== CALIFORNIA_FILENAME) {
			throw new Error(`Unsupported import file: ${fileName}`);
		}
		return this.importCaliforniaCsv(fileName);
	}

	async importCaliforniaCsv(fileName: string): Promise<ImportResult> {
		const filePath = path.join(process.cwd(), 'source_files', fileName);
		const fileContents = await fs.readFile(filePath, 'utf8');
		const rows = parseCsv(fileContents);
		const [headerRow, ...dataRows] = rows;

		if (!headerRow) {
			return { processed: 0, upserted: 0, skipped: 0 };
		}

		const headers = headerRow.map((header) => cleanValue(header));
		let upserted = 0;
		let skipped = 0;

		for (const dataRow of dataRows) {
			if (dataRow.length === 1 && cleanValue(dataRow[0]) === '') {
				continue;
			}

			const record = this.mapRowToRecord(headers, dataRow);
			if (!record) {
				skipped++;
				continue;
			}

			const input = this.mapCaliforniaCsvRecord(record);
			if (!input) {
				skipped++;
				continue;
			}

			const { didWrite } = await this.upsertCaliforniaGrant(input);
			if (didWrite) {
				upserted++;
			} else {
				skipped++;
			}
		}

		return { processed: dataRows.length, upserted, skipped };
	}

	async upsertCaliforniaGrant(
		input: CaliforniaGrantInput,
	): Promise<{ didWrite: boolean }> {
		const deadlineDate = parseDateFlexible(input.deadline);
		let deadlineType: $Enums.GrantDeadlineType | null = null;
		if (deadlineDate) {
			deadlineType = $Enums.GrantDeadlineType.FIXED;
		} else {
			const type = mapToEnumType(input.deadline, [
				'FIXED',
				'ONGOING',
				'ROLLING',
				'TBD',
				'CLOSED',
				'UNKNOWN',
			]);
			deadlineType =
				$Enums.GrantDeadlineType[
					type as keyof typeof $Enums.GrantDeadlineType
				] ?? $Enums.GrantDeadlineType.UNKNOWN;
		}

		const openDateDate = parseDateFlexible(input.openDate);
		let openDateType: $Enums.GrantOpenDateType | null = null;
		if (openDateDate) {
			openDateType = $Enums.GrantOpenDateType.FIXED;
		} else {
			const type = mapToEnumType(input.openDate, [
				'FIXED',
				'ONGOING',
				'ROLLING',
				'TBD',
				'CLOSED',
				'UNKNOWN',
			]);
			openDateType =
				$Enums.GrantOpenDateType[
					type as keyof typeof $Enums.GrantOpenDateType
				] ?? $Enums.GrantOpenDateType.UNKNOWN;
		}

		const currentAsOfDate = parseDateFlexible(input.currentAsOf) ?? new Date();
		const portalIdNumber =
			typeof input.portalId === 'string'
				? Number.isNaN(parseInt(input.portalId, 10))
					? null
					: parseInt(input.portalId, 10)
				: input.portalId;
		const sourceRecordId =
			input.sourceRecordId ||
			(portalIdNumber !== null && portalIdNumber !== undefined
				? String(portalIdNumber)
				: undefined);
		const sourceKey =
			input.sourceKey ||
			(!sourceRecordId
				? buildSourceKeyFromFields([
						input.title,
						input.url,
						input.grantor,
						openDateDate?.toISOString(),
						deadlineDate?.toISOString(),
					])
				: undefined);

		const { status, closedAt } = computeStatus(deadlineDate, input.rawStatus);
		const now = new Date();
		const grantData = {
			url: input.url,
			title: toSmartTitleCase(input.title),
			deadline: deadlineDate ?? null,
			deadlineType,
			openDate: openDateDate ?? null,
			openDateType,
			stateAgency: input.stateAgency,
			matchFunding: input.matchFunding,
			estimatedTotalFunding: BigInt(
				parseFundingAmount(input.estimatedTotalFunding),
			),
			estimatedAwardAmounts: input.estimatedAwardAmounts,
			fundsDisbursment: input.fundsDisbursement,
			currentAsOf: currentAsOfDate,
			grantor: input.grantor,
			portalId: portalIdNumber,
			opportunityType: input.opportunityType,
			purpose: input.purpose,
			eligibleApplicants: input.eligibleApplicants.join(', '),
			eligibleGeographies: input.eligibleGeographies,
			source: $Enums.GrantSource.CALIFORNIA,
			sourceRecordId,
			sourceKey,
			lastSeenAt: now,
			status,
			closedAt,
		};

		const contentHash = computeContentHash({
			source: grantData.source,
			url: grantData.url,
			title: grantData.title,
			deadline: grantData.deadline?.toISOString() ?? null,
			openDate: grantData.openDate?.toISOString() ?? null,
			grantor: grantData.grantor,
			purpose: grantData.purpose,
			matchFunding: grantData.matchFunding,
			estimatedTotalFunding: grantData.estimatedTotalFunding?.toString(),
			estimatedAwardAmounts: grantData.estimatedAwardAmounts,
			eligibleApplicants: grantData.eligibleApplicants,
			eligibleGeographies: grantData.eligibleGeographies,
		});

		const existing = await this.findExistingGrantMeta({
			source: grantData.source,
			sourceRecordId,
			sourceKey,
			number: undefined,
		});

		if (existing && existing.contentHash === contentHash) {
			const updates: Record<string, Date> = {};
			if (shouldTouchLastSeen(existing.lastSeenAt)) {
				updates.lastSeenAt = now;
			}
			if (
				grantData.currentAsOf &&
				(!existing.currentAsOf ||
					grantData.currentAsOf.getTime() !== existing.currentAsOf.getTime())
			) {
				updates.currentAsOf = grantData.currentAsOf;
			}
			if (Object.keys(updates).length > 0) {
				await db.grant.update({
					where: { id: existing.id },
					data: updates,
				});
			}
			return { didWrite: false };
		}

		const fitScorePayload = {
			fitScore: calculateGrantFitScore({
				estimatedTotalFunding: grantData.estimatedTotalFunding ?? null,
				eligibleApplicants: grantData.eligibleApplicants ?? null,
				eligibleGeographies: grantData.eligibleGeographies ?? null,
				purpose: grantData.purpose ?? null,
			}),
			fitScoreVersion: FIT_SCORE_VERSION,
			fitScoreComputedAt: now,
		};

		const dataWithHash = { ...grantData, ...fitScorePayload, contentHash };

		if (existing?.id) {
			await db.grant.update({
				where: { id: existing.id },
				data: dataWithHash,
			});
		} else {
			await db.grant.create({ data: dataWithHash });
		}

		return { didWrite: true };
	}

	async upsertFederalGrant(
		input: FederalGrantInput,
	): Promise<{ didWrite: boolean }> {
		const openDate = parseDateFlexible(input.openDate);
		const closeDate = parseDateFlexible(input.closeDate);
		const sourceKey =
			input.sourceKey ||
			(!input.sourceRecordId
				? buildSourceKeyFromFields([
						input.title,
						input.url,
						input.grantor,
						openDate?.toISOString(),
						closeDate?.toISOString(),
						input.number,
					])
				: undefined);
		const { status, closedAt } = computeStatus(closeDate, undefined);

		const now = new Date();
		const grantData = {
			url: input.url,
			title: toSmartTitleCase(input.title),
			number: input.number,
			openDate: openDate ?? null,
			deadline: closeDate ?? null,
			grantor: input.grantor,
			agencyCode: input.agencyCode,
			awardFloor: BigInt(parseFundingAmount(input.awardFloor)),
			awardCeiling: BigInt(parseFundingAmount(input.awardCeiling)),
			estimatedTotalFunding: null as bigint | null,
			cfdaList: input.cfdaList,
			source: $Enums.GrantSource.FEDERAL,
			sourceRecordId: input.sourceRecordId,
			sourceKey,
			lastSeenAt: now,
			status,
			closedAt,
		};

		const contentHash = computeContentHash({
			source: grantData.source,
			url: grantData.url,
			title: grantData.title,
			number: grantData.number,
			deadline: grantData.deadline?.toISOString() ?? null,
			openDate: grantData.openDate?.toISOString() ?? null,
			grantor: grantData.grantor,
			agencyCode: grantData.agencyCode,
			awardFloor: grantData.awardFloor?.toString(),
			awardCeiling: grantData.awardCeiling?.toString(),
			cfdaList: grantData.cfdaList,
		});

		const existing = await this.findExistingGrantMeta({
			source: grantData.source,
			sourceRecordId: grantData.sourceRecordId,
			number: grantData.number,
			sourceKey,
		});

		if (existing && existing.contentHash === contentHash) {
			if (shouldTouchLastSeen(existing.lastSeenAt)) {
				await db.grant.update({
					where: { id: existing.id },
					data: { lastSeenAt: now },
				});
				return { didWrite: false };
			}
			return { didWrite: false };
		}

		const fundingForScore =
			grantData.estimatedTotalFunding ??
			grantData.awardCeiling ??
			grantData.awardFloor ??
			null;
		const fitScorePayload = {
			fitScore: calculateGrantFitScore({
				estimatedTotalFunding: fundingForScore,
				eligibleApplicants: null,
				eligibleGeographies: null,
				purpose: null,
			}),
			fitScoreVersion: FIT_SCORE_VERSION,
			fitScoreComputedAt: now,
		};

		const dataWithHash = { ...grantData, ...fitScorePayload, contentHash };

		if (existing?.id) {
			await db.grant.update({
				where: { id: existing.id },
				data: dataWithHash,
			});
		} else {
			await db.grant.create({ data: dataWithHash });
		}

		return { didWrite: true };
	}

	private mapRowToRecord(
		headers: string[],
		row: string[],
	): CaliforniaCsvRow | null {
		if (!headers.length) return null;
		const record: CaliforniaCsvRow = {};
		headers.forEach((header, idx) => {
			record[header] = cleanValue(row[idx] ?? '');
		});
		return record;
	}

	private mapCaliforniaCsvRecord(
		record: CaliforniaCsvRow,
	): CaliforniaGrantInput | null {
		const portalId = cleanValue(record.PortalID);
		const url = cleanValue(record.GrantURL);
		const title = cleanValue(record.Title);
		const sourceRecordId = this.pickSourceRecordId(record);
		if (!sourceRecordId && !portalId) {
			return null;
		}
		if (!url || !title) {
			return null;
		}

		const eligibleApplicants = splitList(record.ApplicantType);
		const eligibleGeographies = cleanValue(record.Geography) || undefined;
		const fundsDisbursement = combineValueWithNote(
			record.FundingMethod,
			record.FundingMethodNotes,
		);
		const matchFunding = combineValueWithNote(
			record.MatchingFunds,
			record.MatchingFundsNotes,
		);

		return {
			url,
			title,
			deadline: cleanValue(record.ApplicationDeadline),
			openDate: cleanValue(record.OpenDate),
			stateAgency: cleanValue(record.AgencyDept),
			matchFunding,
			estimatedTotalFunding: cleanValue(record.EstAvailFunds),
			estimatedAwardAmounts: cleanValue(record.EstAmounts || record.EstAwards),
			fundsDisbursement,
			currentAsOf: cleanValue(record.LastUpdated),
			grantor:
				cleanValue(
					record.AgencyDept || record.FundingSource || record.AgencyURL,
				) || 'Unknown',
			portalId,
			opportunityType: cleanValue(record.Type),
			purpose: cleanValue(record.Purpose || record.Description),
			eligibleApplicants,
			eligibleGeographies,
			rawStatus: cleanValue(record.Status),
			sourceRecordId:
				sourceRecordId || (portalId ? String(portalId) : undefined),
			sourceKey: cleanValue(record.sourceKey),
		};
	}

	private pickSourceRecordId(record: CaliforniaCsvRow): string | undefined {
		const preferredKeys = [
			'portal_id',
			'portalId',
			'opportunity_id',
			'record_id',
			'_id',
			'id',
			'PortalID',
		];
		for (const key of preferredKeys) {
			const value = cleanValue(record[key]);
			if (value) return value;
		}
		return undefined;
	}

	private async findExistingGrantMeta(identity: {
		source: $Enums.GrantSource;
		sourceRecordId?: string;
		number?: string;
		sourceKey?: string;
	}): Promise<{
		id: string;
		contentHash: string | null;
		lastSeenAt: Date | null;
		currentAsOf: Date | null;
		fitScoreVersion: number | null;
	} | null> {
		const select = {
			id: true,
			contentHash: true,
			lastSeenAt: true,
			currentAsOf: true,
			fitScoreVersion: true,
		};

		if (identity.sourceRecordId) {
			const grant = await db.grant.findUnique({
				where: {
					source_sourceRecordId: {
						source: identity.source,
						sourceRecordId: identity.sourceRecordId,
					},
				},
				select,
			});
			if (grant) return grant;
		}

		if (identity.number) {
			const grant = await db.grant.findUnique({
				where: {
					source_number: {
						source: identity.source,
						number: identity.number,
					},
				},
				select,
			});
			if (grant) return grant;
		}

		if (identity.sourceKey) {
			const grant = await db.grant.findUnique({
				where: {
					source_sourceKey: {
						source: identity.source,
						sourceKey: identity.sourceKey,
					},
				},
				select,
			});
			if (grant) return grant;
		}

		return null;
	}
}

export const grantImportService = new GrantImportService();
export { CALIFORNIA_FILENAME };
