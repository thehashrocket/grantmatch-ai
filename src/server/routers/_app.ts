import { z } from 'zod';
import { router, publicProcedure } from '../trpc';

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'World'}! Welcome to GrantMatchAI`,
      };
    }),
});

export type AppRouter = typeof appRouter; 