import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';

const MAX_GRANTS = 50;

const requireOrganizationId = (organizationId: string | null | undefined) => {
	if (!organizationId) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Organization is required',
		});
	}
	return organizationId;
};

const grantIdsInput = z.object({
	grantIds: z.array(z.string().min(1)).min(1).max(MAX_GRANTS),
});

export const matchRouter = router({
	ensureForGrants: protectedProcedure
		.input(grantIdsInput)
		.mutation(async ({ ctx, input }) => {
			const organizationId = requireOrganizationId(ctx.session?.organizationId);
			const grantIds = Array.from(new Set(input.grantIds));

			if (grantIds.length === 0) {
				return { createdCount: 0, updatedCount: 0 };
			}

			return ensureGrantMatches({
				prisma: ctx.prisma,
				organizationId,
				grantIds,
			});
		}),

	scoreMap: protectedProcedure
		.input(grantIdsInput)
		.query(async ({ ctx, input }) => {
			const organizationId = requireOrganizationId(ctx.session?.organizationId);
			const grantIds = Array.from(new Set(input.grantIds));

			if (grantIds.length === 0) return {};

			const matches = await ctx.prisma.grantMatch.findMany({
				where: {
					organizationId,
					grantId: { in: grantIds },
				},
				select: {
					grantId: true,
					fitScore: true,
					subscoresJson: true,
					explanation: true,
				},
			});

			return matches.reduce<
				Record<
					string,
					{ fitScore: number; subscores?: unknown; explanation?: string }
				>
			>((acc, match) => {
				acc[match.grantId] = {
					fitScore: match.fitScore,
					subscores: match.subscoresJson ?? undefined,
					explanation: match.explanation ?? undefined,
				};
				return acc;
			}, {});
		}),
});
