import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { container } from '@/lib/container';

export const grantsRouter = router({
  getMatches: publicProcedure
    .input(z.object({
      textSearch: z.string().optional(),
      minFunding: z.string().optional(),
      maxFunding: z.string().optional(),
      minDeadline: z.string().optional(),
      maxDeadline: z.string().optional(),
      minFitScore: z.string().optional(),
      maxFitScore: z.string().optional(),
      source: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const grantService = container.getGrantService();
      const filters = input || {};
      
      return grantService.searchGrants(filters);
    }),

  getMatchesPaginated: publicProcedure
    .input(z.object({
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
    }))
    .query(async ({ input }) => {
      const grantService = container.getGrantService();
      const { page, pageSize, ...filters } = input;
      
      return grantService.searchGrantsPaginated(filters, page, pageSize);
    }),
}); 