import { z } from 'zod';
import type {
	Confidence,
	MissingSignal,
	Reason,
} from '@/lib/utils/org-grant-scoring';

const reasonSchema = z.object({
	label: z.string(),
	detail: z
		.string()
		.trim()
		.optional()
		.transform((value) => (value && value.length > 0 ? value : undefined)),
	strength: z.enum(['strong', 'medium', 'neutral', 'weak']),
});

const matchesSchema = z
	.object({
		priorityMatches: z.array(z.string()).default([]),
		focusMatches: z.array(z.string()).default([]),
		geographyOverlap: z.array(z.string()).default([]),
		amountInRange: z.boolean().nullable().optional(),
	})
	.partial()
	.default({});

const explanationSchema = z
	.object({
		eligibility: z.number().optional(),
		geography: z.number().optional(),
		purpose: z.number().optional(),
		funding: z.number().optional(),
		reasons: z.array(reasonSchema).max(10).optional(),
		confidence: z.enum(['HIGH', 'MED', 'LOW']).optional(),
		missing: z
			.array(z.enum(['PURPOSE', 'APPLICANTS', 'GEOGRAPHY', 'FUNDING']))
			.optional(),
		matches: matchesSchema.optional(),
	})
	.passthrough();

export type ParsedExplanation = {
	subscores: Record<string, number>;
	reasons: Reason[];
	confidence?: Confidence;
	missing?: MissingSignal[];
	matches?: {
		priorityMatches: string[];
		focusMatches: string[];
		geographyOverlap: string[];
		amountInRange: boolean | null;
	};
};

export function parseSubscoresJson(raw: unknown): ParsedExplanation | null {
	const parsed = explanationSchema.safeParse(raw);
	if (!parsed.success) return null;

	const {
		eligibility,
		geography,
		purpose,
		funding,
		reasons,
		confidence,
		missing,
		matches,
	} = parsed.data;

	const subscores: Record<string, number> = {};
	if (typeof eligibility === 'number') subscores.eligibility = eligibility;
	if (typeof geography === 'number') subscores.geography = geography;
	if (typeof purpose === 'number') subscores.purpose = purpose;
	if (typeof funding === 'number') subscores.funding = funding;

	return {
		subscores,
		reasons: (reasons ?? []).slice(0, 4),
		confidence,
		missing,
		matches: matches
			? {
					priorityMatches: matches.priorityMatches ?? [],
					focusMatches: matches.focusMatches ?? [],
					geographyOverlap: matches.geographyOverlap ?? [],
					amountInRange:
						matches.amountInRange === undefined
							? null
							: (matches.amountInRange ?? null),
				}
			: undefined,
	};
}
