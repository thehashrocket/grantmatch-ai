import { $Enums } from '@/prisma/generated/client';
import { z } from 'zod';

export const normalizedGrantSchema = z.object({
	source: z.string(),
	sourceRecordId: z.string().optional(),
	sourceKey: z.string().optional(),
	number: z.string().optional(),
	url: z.string().url(),
	title: z.string().min(1),
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
	portalId: z.number().int().nullable().optional(),
	matchFunding: z.string().optional(),
	estimatedTotalFunding: z
		.union([z.bigint(), z.number()])
		.nullable()
		.optional(),
	awardFloor: z.union([z.bigint(), z.number()]).nullable().optional(),
	awardCeiling: z.union([z.bigint(), z.number()]).nullable().optional(),
	estimatedAwardAmounts: z.string().optional(),
	fundsDisbursment: z.string().optional(),
	agencyCode: z.string().optional(),
	cfdaList: z.array(z.string()).optional(),
	status: z.nativeEnum($Enums.GrantStatus),
	closedAt: z.date().nullable().optional(),
	contentHash: z.string(),
	lastSeenAt: z.date(),
	details: z
		.object({
			title: z.string().optional(),
			purpose: z.string().optional(),
			description: z.string().optional(),
			eligibilityRequirements: z.unknown().optional(),
			fundingDetails: z.unknown().optional(),
			fetchedAt: z.date().optional(),
		})
		.optional(),
});

export const MAX_TICK_ERRORS = 20;
