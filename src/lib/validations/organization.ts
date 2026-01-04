// src/lib/validations/organization.ts

import { z } from 'zod';
import { $Enums } from '@/prisma/generated/client';

const tagArray = z.array(z.string().min(1).max(100)).max(20).nullish();
const emptyToUndefined = <T>(schema: z.ZodType<T>) =>
	z.preprocess((val) => (val === '' ? undefined : val), schema);

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

export const updateOrganizationProfileSchema = z.object({
	entityType: emptyToUndefined(
		z.nativeEnum($Enums.OrganizationEntityType).nullish(),
	),
	revenueSources: z.array(z.nativeEnum($Enums.RevenueSource)).max(20).nullish(),
	budgetRange: emptyToUndefined(z.nativeEnum($Enums.BudgetRange).nullish()),
	staffRange: emptyToUndefined(z.nativeEnum($Enums.StaffRange).nullish()),
	focusAreas: tagArray,
	serviceAreas: tagArray,
	priorityFocusKeywords: z.array(z.string()).max(5).optional(),
	mission: z.string().max(2000).nullish(),
	description: z.string().max(5000).nullish(),
});
