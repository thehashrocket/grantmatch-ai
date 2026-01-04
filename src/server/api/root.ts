// /src/server/api/root.ts

import { z } from 'zod';
import { router, publicProcedure } from './trpc';
import { organizationRouter } from './routers/organization';
import { grantsRouter } from './routers/grants';
import { bookmarkRouter } from './routers/bookmark';
import { matchRouter } from './routers/match';

export const appRouter = router({
	hello: publicProcedure
		.input(z.object({ name: z.string().optional() }))
		.query(({ input }) => ({
			greeting: `Hello ${input.name ?? 'World'}! Welcome to GrantMatchAI`,
		})),
	organization: organizationRouter,
	grants: grantsRouter,
	bookmark: bookmarkRouter,
	match: matchRouter,
});

// This is needed for tRPC type inference
export type AppRouter = typeof appRouter;
export type { organizationRouter };
