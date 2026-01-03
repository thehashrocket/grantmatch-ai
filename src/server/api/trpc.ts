// /src/server/api/trpc.ts

import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

// 👇 adjust this import to wherever your NextAuth config lives
import { authOptions } from '@/lib/auth';

export const createTRPCContext = async (opts: { headers: Headers }) => {
	const session = await getServerSession(authOptions);

	return {
		headers: opts.headers,
		session: session
			? {
					userId: session.user.id,
					role: session.user.role,
					organizationId: session.user.organizationId ?? null,
				}
			: null,
		prisma,
	};
};

type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<TRPCContext>().create({
	transformer: superjson,
	errorFormatter({ shape, error }) {
		return {
			...shape,
			data: {
				...shape.data,
				zodError:
					error.cause instanceof ZodError ? error.cause.flatten() : null,
			},
		};
	},
});

const enforceUser = t.middleware(({ ctx, next }) => {
	if (!ctx.session?.userId) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}
	return next({
		ctx: {
			...ctx,
			session: ctx.session,
		},
	});
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(enforceUser);
