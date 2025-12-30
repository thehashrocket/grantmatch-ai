import { createHash } from 'node:crypto';

import { parseDateFlexible } from '@/lib/utils';
import { $Enums } from '@/prisma/generated/client';

export function pickField(
	record: Record<string, unknown>,
	candidates: string[],
): unknown {
	for (const key of candidates) {
		if (record[key] !== undefined && record[key] !== null) {
			const val = record[key];
			if (String(val).trim() !== '') return val;
		}
	}
	return undefined;
}

export function normalizeString(value: unknown): string | undefined {
	if (value === undefined || value === null) return undefined;
	const str = String(value).replace(/\s+/g, ' ').trim();
	return str.length ? str : undefined;
}

export function normalizeList(value: unknown): string[] | undefined {
	if (value === undefined || value === null) return undefined;
	const str = String(value);
	const parts = str
		.split(/[,;]+/)
		.map((item) => normalizeString(item))
		.filter((item): item is string => Boolean(item));
	return parts.length ? parts : undefined;
}

export function parseDateLoose(value: unknown): Date | undefined {
	if (value === undefined || value === null) return undefined;
	const parsed = parseDateFlexible(String(value));
	return parsed ?? undefined;
}

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function canonicalizeForHash(obj: Record<string, unknown>): string {
	return JSON.stringify(obj, Object.keys(obj).sort());
}

export function computeSourceKey(
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

export function computeContentHash(fields: Record<string, unknown>): string {
	return sha256(canonicalizeForHash(fields));
}

export function computeStatus(
	deadline: Date | undefined,
	rawStatus?: string,
): { status: $Enums.GrantStatus; closedAt: Date | null } {
	const now = new Date();
	const norm = rawStatus?.toLowerCase() ?? '';
	const isClosedByText = ['closed', 'inactive', 'expired', 'ended'].some(
		(marker) => norm.includes(marker),
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

	// Prefer OPEN when unsure but allow UNKNOWN if no signal at all
	return norm
		? { status: $Enums.GrantStatus.UNKNOWN, closedAt: null }
		: { status: $Enums.GrantStatus.OPEN, closedAt: null };
}

export function diffObjects(
	before: Record<string, unknown> | null,
	after: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> | null {
	if (!before) return null;
	const diff: Record<string, { before: unknown; after: unknown }> = {};
	const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
	for (const key of keys) {
		const oldVal = before[key];
		const newVal = after[key];
		if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
			diff[key] = { before: oldVal, after: newVal };
		}
	}
	return Object.keys(diff).length ? diff : null;
}
