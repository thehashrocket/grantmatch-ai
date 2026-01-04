import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { container } from '@/lib/container';
import type { $Enums } from '@/prisma/generated/client';
import type { GrantSearchFilters } from '@/lib/types/grant';
import { backfillGrantMatchesForOrg } from '@/server/grants/match/backfillOrganization';

type MatchIndexStatus = $Enums.MatchIndexStatus;

export const grantsRouter = router({
	getMatches: publicProcedure
		.input(
			z
				.object({
					textSearch: z.string().optional(),
					minFunding: z.string().optional(),
					maxFunding: z.string().optional(),
					minDeadline: z.string().optional(),
					maxDeadline: z.string().optional(),
					deadlineWithinDays: z.string().optional(),
					minFitScore: z.string().optional(),
					maxFitScore: z.string().optional(),
					source: z.string().optional(),
					sort: z
						.enum(['FIT_DESC', 'DEADLINE_ASC', 'DEADLINE_DESC', 'NEWEST'])
						.optional(),
				})
				.optional(),
		)
		.query(async ({ input, ctx }) => {
			const grantService = container.getGrantService();
			const filters = input || {};
			const normalizedFilters: GrantSearchFilters = {
				textSearch: filters.textSearch ?? '',
				minFunding: filters.minFunding ?? '',
				maxFunding: filters.maxFunding ?? '',
				minDeadline: filters.minDeadline ?? '',
				maxDeadline: filters.maxDeadline ?? '',
				deadlineWithinDays: filters.deadlineWithinDays ?? '',
				minFitScore: filters.minFitScore ?? '',
				maxFitScore: filters.maxFitScore ?? '',
				source: filters.source ?? 'ALL',
				sort: filters.sort ?? 'FIT_DESC',
			};

			const organizationId =
				(ctx.session?.organizationId as string | null) ?? null;
			let matchIndexStatus: MatchIndexStatus | null = null;
			let useOrgMatches = false;

			if (organizationId) {
				const organization = (await ctx.prisma.organization.findUnique({
					where: { id: organizationId },
					select: { matchIndexStatus: true },
				})) || { matchIndexStatus: null };
				matchIndexStatus = organization?.matchIndexStatus ?? null;

				if (
					matchIndexStatus === 'NOT_STARTED' ||
					matchIndexStatus === 'FAILED'
				) {
					void backfillGrantMatchesForOrg({
						prisma: ctx.prisma,
						organizationId,
					});
				}

				useOrgMatches = matchIndexStatus === 'COMPLETE';
			}

			return grantService.searchGrants(
				normalizedFilters,
				useOrgMatches ? organizationId : null,
				matchIndexStatus ?? undefined,
			);
		}),

	getMatchesPaginated: publicProcedure
		.input(
			z.object({
				textSearch: z.string().optional(),
				minFunding: z.string().optional(),
				maxFunding: z.string().optional(),
				minDeadline: z.string().optional(),
				maxDeadline: z.string().optional(),
				deadlineWithinDays: z.string().optional(),
				minFitScore: z.string().optional(),
				maxFitScore: z.string().optional(),
				source: z.string().optional(),
				sort: z
					.enum(['FIT_DESC', 'DEADLINE_ASC', 'DEADLINE_DESC', 'NEWEST'])
					.optional(),
				page: z.number().min(1).default(1),
				pageSize: z.number().min(1).max(100).default(10),
			}),
		)
		.query(async ({ input, ctx }) => {
			const grantService = container.getGrantService();
			const { page, pageSize, ...filters } = input;
			const normalizedFilters: GrantSearchFilters = {
				textSearch: filters.textSearch ?? '',
				minFunding: filters.minFunding ?? '',
				maxFunding: filters.maxFunding ?? '',
				minDeadline: filters.minDeadline ?? '',
				maxDeadline: filters.maxDeadline ?? '',
				deadlineWithinDays: filters.deadlineWithinDays ?? '',
				minFitScore: filters.minFitScore ?? '',
				maxFitScore: filters.maxFitScore ?? '',
				source: filters.source ?? 'ALL',
				sort: filters.sort ?? 'FIT_DESC',
			};

			const organizationId =
				(ctx.session?.organizationId as string | null) ?? null;
			let matchIndexStatus: MatchIndexStatus | null = null;
			let useOrgMatches = false;

			if (organizationId) {
				const organization = (await ctx.prisma.organization.findUnique({
					where: { id: organizationId },
					select: { matchIndexStatus: true },
				})) || { matchIndexStatus: null };
				matchIndexStatus = organization?.matchIndexStatus ?? null;

				if (
					matchIndexStatus === 'NOT_STARTED' ||
					matchIndexStatus === 'FAILED'
				) {
					void backfillGrantMatchesForOrg({
						prisma: ctx.prisma,
						organizationId,
					});
				}

				useOrgMatches = matchIndexStatus === 'COMPLETE';
			}

			return grantService.searchGrantsPaginated(
				normalizedFilters,
				page,
				pageSize,
				useOrgMatches ? organizationId : null,
				matchIndexStatus ?? undefined,
			);
		}),
});
