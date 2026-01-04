import { TRPCError } from '@trpc/server';

export const normalizeTags = (values?: string[] | null) => {
	if (!values) return [];
	const cleaned = values
		.map((value) => value.replace(/\s+/g, ' ').trim().toLowerCase())
		.filter((value) => value.length > 0);
	const unique = Array.from(new Set(cleaned));

	if (unique.length > 10) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'TAG_LIMIT_EXCEEDED',
		});
	}

	for (const value of unique) {
		if (value.length > 30) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'TAG_TOO_LONG',
			});
		}
	}

	return unique;
};

export const normalizeText = (value?: string | null) => {
	if (value === undefined) return undefined;
	if (value === null) return null;
	const normalized = value.replace(/\s+/g, ' ').trim();
	return normalized.length === 0 ? null : normalized;
};
