// src/lib/validations/organization.ts

import { z } from 'zod';
import { $Enums } from '@/prisma/generated/client';

const tagArray = z.array(z.string().min(1).max(100)).max(20).nullish();
// `.optional()` is load-bearing under Zod 4: `z.preprocess` widens the input
// type to `unknown`, which would otherwise make every wrapped key required.
const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
	z
		.preprocess((val: unknown) => (val === '' ? undefined : val), schema)
		.optional();

export const createOrganizationSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	focusAreas: z.array(z.string()).optional(),
	address1: z.string().min(1, 'Address is required'),
	address2: z.string().optional(),
	city: z.string().min(1, 'City is required'),
	state: z.string().min(1, 'State is required'),
	zipCode: z.string().min(1, 'ZIP code is required'),
	mission: z.string().max(2000).optional(),
});

export const updateOrganizationProfileSchema = z
	.object({
		entityType: emptyToUndefined(
			z.enum($Enums.OrganizationEntityType).nullish(),
		),
		revenueSources: z
			.array(z.enum($Enums.RevenueSource))
			.max(20)
			.nullish(),
		budgetRange: emptyToUndefined(z.enum($Enums.BudgetRange).nullish()),
		staffRange: emptyToUndefined(z.enum($Enums.StaffRange).nullish()),
		focusAreas: tagArray,
		serviceAreas: tagArray,
		priorityFocusKeywords: z.array(z.string()).max(5).optional(),
		mission: z.string().max(2000).nullish(),
		description: z.string().max(5000).nullish(),
		minAward: emptyToUndefined(z.number().int().nonnegative().nullish()),
		maxAward: emptyToUndefined(z.number().int().nonnegative().nullish()),
	})
	.superRefine((data, ctx) => {
		if (
			data.minAward !== null &&
			data.minAward !== undefined &&
			data.maxAward !== null &&
			data.maxAward !== undefined &&
			data.minAward > data.maxAward
		) {
			ctx.addIssue({
				code: 'custom',
				message: 'MIN_AWARD_GT_MAX_AWARD',
				path: ['minAward'],
			});
		}
	});
