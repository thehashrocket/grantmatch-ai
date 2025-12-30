import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { container } from '@/lib/container';
import type { GrantSearchFilters } from '@/lib/types/grant';

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
					minFitScore: z.string().optional(),
					maxFitScore: z.string().optional(),
					source: z.string().optional(),
				})
				.optional(),
		)
		.query(async ({ input }) => {
			const grantService = container.getGrantService();
			const filters = input || {};
			const normalizedFilters: GrantSearchFilters = {
				textSearch: filters.textSearch ?? '',
				minFunding: filters.minFunding ?? '',
				maxFunding: filters.maxFunding ?? '',
				minDeadline: filters.minDeadline ?? '',
				maxDeadline: filters.maxDeadline ?? '',
				minFitScore: filters.minFitScore ?? '',
				maxFitScore: filters.maxFitScore ?? '',
				source: filters.source ?? 'ALL',
			};

			return grantService.searchGrants(normalizedFilters);
		}),

	getMatchesPaginated: publicProcedure
		.input(
			z.object({
				textSearch: z.string().optional(),
				minFunding: z.string().optional(),
				maxFunding: z.string().optional(),
				minDeadline: z.string().optional(),
				maxDeadline: z.string().optional(),
				minFitScore: z.string().optional(),
				maxFitScore: z.string().optional(),
				source: z.string().optional(),
				page: z.number().min(1).default(1),
				pageSize: z.number().min(1).max(100).default(10),
			}),
		)
		.query(async ({ input }) => {
			const grantService = container.getGrantService();
			const { page, pageSize, ...filters } = input;
			const normalizedFilters: GrantSearchFilters = {
				textSearch: filters.textSearch ?? '',
				minFunding: filters.minFunding ?? '',
				maxFunding: filters.maxFunding ?? '',
				minDeadline: filters.minDeadline ?? '',
				maxDeadline: filters.maxDeadline ?? '',
				minFitScore: filters.minFitScore ?? '',
				maxFitScore: filters.maxFitScore ?? '',
				source: filters.source ?? 'ALL',
			};

			return grantService.searchGrantsPaginated(
				normalizedFilters,
				page,
				pageSize,
			);
		}),
});
