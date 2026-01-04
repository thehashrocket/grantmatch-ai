// src/server/api/routers/organization.ts

import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import {
	createOrganizationSchema,
	updateOrganizationProfileSchema,
} from '@/lib/validations/organization';
import { SCORING_VERSION } from '@/lib/utils/org-grant-scoring';
import { normalizeTags, normalizeText } from '@/lib/utils/normalizeTags';
import type { Prisma } from '@/prisma/generated/client';

const normalizePriorityKeywords = (values?: string[] | null) => {
	const normalized = normalizeTags(values ?? []);
	if (normalized.length > 5) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'PRIORITY_TAG_LIMIT_EXCEEDED',
		});
	}
	return normalized;
};

export const organizationRouter = router({
	create: publicProcedure
		.input(createOrganizationSchema)
		.mutation(async ({ ctx, input }) => {
			const mission =
				normalizeText(input.mission ?? input.description ?? null) ?? 'TBD';
			const description = normalizeText(input.description);
			const focusAreas =
				input.focusAreas === undefined
					? undefined
					: normalizeTags(input.focusAreas);

			const organization = await ctx.prisma.organization.create({
				data: {
					name: input.name,
					address1: input.address1,
					address2: input.address2,
					city: input.city,
					state: input.state,
					zipCode: input.zipCode,
					description: description ?? null,
					focusAreas,
					mission,
					matchIndexStatus: 'NOT_STARTED',
					matchIndexedCount: 0,
					matchIndexedAt: null,
					matchIndexError: null,
					matchIndexErrorJson: [],
					matchIndexCursor: null,
					matchIndexClaimId: null,
					matchIndexClaimedAt: null,
				},
			});

			return organization;
		}),
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		const organizationId = ctx.session?.organizationId ?? null;
		if (!organizationId) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'MISSING_ORGANIZATION',
			});
		}

		const organization = (await ctx.prisma.organization.findUnique({
			where: { id: organizationId },
			select: {
				entityType: true,
				revenueSources: true,
				budgetRange: true,
				staffRange: true,
				focusAreas: true,
				serviceAreas: true,
				priorityFocusKeywords: true,
				mission: true,
				description: true,
				scoringVersion: true,
				matchIndexStatus: true,
				matchIndexedAt: true,
				matchIndexedCount: true,
				matchIndexError: true,
				matchIndexCursor: true,
				matchIndexClaimId: true,
				matchIndexClaimedAt: true,
				matchIndexErrorJson: true,
			} as unknown as Prisma.OrganizationSelect,
		})) as (typeof ctx.prisma.organization)['findUnique'] extends (
			...args: any[]
		) => Promise<infer R>
			? (R extends null ? null : R & { priorityFocusKeywords?: string[] })
			: null;

		if (!organization) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Organization not found',
			});
		}

		return {
			...organization,
			revenueSources: organization.revenueSources ?? [],
			focusAreas: organization.focusAreas ?? [],
			serviceAreas: organization.serviceAreas ?? [],
			priorityFocusKeywords: organization.priorityFocusKeywords ?? [],
		};
	}),
	getIndexStatus: protectedProcedure.query(async ({ ctx }) => {
		const organizationId = ctx.session?.organizationId ?? null;
		if (!organizationId) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'MISSING_ORGANIZATION',
			});
		}

		const organization = await ctx.prisma.organization.findUnique({
			where: { id: organizationId },
			select: {
				matchIndexStatus: true,
				matchIndexedCount: true,
				matchIndexedAt: true,
				matchIndexError: true,
			},
		});

		if (!organization) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Organization not found',
			});
		}

		return organization;
	}),
	updateProfile: protectedProcedure
		.input(updateOrganizationProfileSchema)
		.mutation(async ({ ctx, input }) => {
			const organizationId = ctx.session?.organizationId ?? null;
			if (!organizationId) {
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'MISSING_ORGANIZATION',
				});
			}

		const organization = (await ctx.prisma.organization.findUnique({
			where: { id: organizationId },
			select: {
				entityType: true,
				revenueSources: true,
				budgetRange: true,
				staffRange: true,
				focusAreas: true,
				serviceAreas: true,
				priorityFocusKeywords: true,
				mission: true,
				description: true,
				scoringVersion: true,
				matchIndexStatus: true,
				matchIndexedAt: true,
				matchIndexedCount: true,
				matchIndexError: true,
				matchIndexCursor: true,
				matchIndexClaimId: true,
				matchIndexClaimedAt: true,
				matchIndexErrorJson: true,
			} as unknown as Prisma.OrganizationSelect,
		})) as (typeof ctx.prisma.organization)['findUnique'] extends (
			...args: any[]
		) => Promise<infer R>
			? (R extends null ? null : R & { priorityFocusKeywords?: string[] })
			: null;

			if (!organization) {
				throw new TRPCError({
					code: 'NOT_FOUND',
					message: 'Organization not found',
				});
			}

			const focusAreas =
				input.focusAreas === undefined
					? undefined
					: normalizeTags(input.focusAreas ?? []);
			const serviceAreas =
				input.serviceAreas === undefined
					? undefined
					: normalizeTags(input.serviceAreas ?? []);
			const priorityFocusKeywords =
				input.priorityFocusKeywords === undefined
					? undefined
					: normalizePriorityKeywords(input.priorityFocusKeywords ?? []);
			const revenueSources =
				input.revenueSources === undefined
					? undefined
					: Array.from(new Set(input.revenueSources ?? []));
			const mission =
				input.mission === undefined ? undefined : normalizeText(input.mission);
			const description =
				input.description === undefined
					? undefined
					: normalizeText(input.description);

			const currentRevenueSources = organization.revenueSources ?? [];
			const currentFocusAreas = organization.focusAreas ?? [];
			const currentServiceAreas = organization.serviceAreas ?? [];
			const currentPriorityFocus =
				(organization as { priorityFocusKeywords?: string[] }).priorityFocusKeywords ??
				[];

			const nextEntityType =
				input.entityType === undefined
					? organization.entityType
					: input.entityType;
			const nextRevenueSources =
				revenueSources === undefined ? currentRevenueSources : revenueSources;
			const nextBudgetRange =
				input.budgetRange === undefined
					? organization.budgetRange
					: input.budgetRange;
			const nextStaffRange =
				input.staffRange === undefined
					? organization.staffRange
					: input.staffRange;
			const nextFocusAreas =
				focusAreas === undefined ? currentFocusAreas : focusAreas;
			const nextServiceAreas =
				serviceAreas === undefined ? currentServiceAreas : serviceAreas;
			const nextPriorityFocusKeywords =
				priorityFocusKeywords === undefined
					? currentPriorityFocus
					: priorityFocusKeywords;
			const nextMission =
				mission === undefined ? organization.mission : (mission ?? 'TBD');
			const nextDescription =
				description === undefined
					? organization.description
					: (description ?? null);

			const stableJoin = (values: string[]) => [...values].sort().join('|');
			const scoringChanged =
				nextEntityType !== organization.entityType ||
				nextBudgetRange !== organization.budgetRange ||
				nextStaffRange !== organization.staffRange ||
				stableJoin(nextRevenueSources) !== stableJoin(currentRevenueSources) ||
				stableJoin(nextFocusAreas) !== stableJoin(currentFocusAreas) ||
				stableJoin(nextServiceAreas) !== stableJoin(currentServiceAreas) ||
				stableJoin(nextPriorityFocusKeywords) !==
					stableJoin(currentPriorityFocus);
			const missionChanged = nextMission !== organization.mission;
			const descriptionChanged =
				(nextDescription ?? null) !== (organization.description ?? null);

			if (!scoringChanged && !missionChanged && !descriptionChanged) {
				return {
					...organization,
					entityType: nextEntityType,
					revenueSources: nextRevenueSources,
					budgetRange: nextBudgetRange,
					staffRange: nextStaffRange,
					focusAreas: nextFocusAreas,
					serviceAreas: nextServiceAreas,
					priorityFocusKeywords: nextPriorityFocusKeywords,
					mission: nextMission,
					description: nextDescription,
				};
			}

			const data: Prisma.OrganizationUpdateInput = {};

			if (input.entityType !== undefined) {
				data.entityType = nextEntityType;
			}
			if (revenueSources !== undefined) {
				data.revenueSources = nextRevenueSources;
			}
			if (input.budgetRange !== undefined) {
				data.budgetRange = nextBudgetRange;
			}
			if (input.staffRange !== undefined) {
				data.staffRange = nextStaffRange;
			}
			if (focusAreas !== undefined) {
				data.focusAreas = nextFocusAreas;
			}
			if (serviceAreas !== undefined) {
				data.serviceAreas = nextServiceAreas;
			}
			if (priorityFocusKeywords !== undefined) {
				data.priorityFocusKeywords = nextPriorityFocusKeywords;
			}
			if (mission !== undefined) {
				data.mission = nextMission;
			}
			if (description !== undefined) {
				data.description = nextDescription;
			}

			if (scoringChanged) {
				data.scoringVersion = SCORING_VERSION;
				data.matchIndexStatus = 'NOT_STARTED';
				data.matchIndexedAt = null;
				data.matchIndexedCount = 0;
				data.matchIndexError = null;
				data.matchIndexCursor = null;
				data.matchIndexClaimId = null;
				data.matchIndexClaimedAt = null;
				data.matchIndexErrorJson = [];
			}

			const updated = await ctx.prisma.organization.update({
				where: { id: organizationId },
				data,
			});

			return {
				...updated,
				revenueSources: updated.revenueSources ?? [],
				focusAreas: updated.focusAreas ?? [],
				serviceAreas: updated.serviceAreas ?? [],
				priorityFocusKeywords:
					(updated as { priorityFocusKeywords?: string[] }).priorityFocusKeywords ?? [],
			};
		}),
});
