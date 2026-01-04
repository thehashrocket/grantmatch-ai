// /src/server/api/routers/bookmark.ts

import { router, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import {
	calculateDaysUntilDeadline,
	calculateGrantFitScore,
} from '@/lib/utils/grant-scoring';
import type { GrantMatch } from '@/lib/types/grant';
import { $Enums, Prisma } from '@/prisma/generated/client';
import type { PrismaClient } from '@/prisma/generated/client';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';

const BOOKMARK_LIMIT = 100;

const bookmarkStatusSchema = z.nativeEnum($Enums.BookmarkStatus);
const grantStatusSchema = z.nativeEnum($Enums.GrantStatus);

const sortEnum = z.enum([
	'BOOKMARKED_AT_DESC',
	'DEADLINE_ASC',
	'DEADLINE_DESC',
	'TITLE_ASC',
	'AMOUNT_DESC',
	'FIT_DESC',
]);

const bookmarkGrantSelect = {
	id: true,
	title: true,
	url: true,
	deadline: true,
	fitScore: true,
	fitScoreVersion: true,
	fitScoreComputedAt: true,
	source: true,
	purpose: true,
	estimatedTotalFunding: true,
	awardFloor: true,
	awardCeiling: true,
	eligibleApplicants: true,
	eligibleGeographies: true,
	status: true,
	closedAt: true,
	detailsStatus: true,
	detailsFetchedAt: true,
} satisfies Prisma.GrantSelect;

type BookmarkGrant = Prisma.GrantGetPayload<{
	select: typeof bookmarkGrantSelect;
}>;

const normalizeTags = (tags?: string[] | null) => {
	if (!tags) return [];
	const cleaned = tags
		.map((tag) => tag.replace(/\s+/g, ' ').trim().toLowerCase())
		.filter((tag) => tag.length > 0);

	const unique = Array.from(new Set(cleaned));

	if (unique.length > 10) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'TAG_LIMIT_EXCEEDED',
		});
	}

	for (const tag of unique) {
		if (tag.length > 30) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'TAG_TOO_LONG',
			});
		}
	}

	return unique;
};

const mapGrantToMatch = (
	grant: BookmarkGrant,
	override?: { fitScore?: number; explanation?: string | null },
): GrantMatch => {
	const fitScore =
		override?.fitScore ??
		grant.fitScore ??
		calculateGrantFitScore({
			estimatedTotalFunding: grant.estimatedTotalFunding ?? null,
			eligibleApplicants: grant.eligibleApplicants ?? null,
			eligibleGeographies: grant.eligibleGeographies ?? null,
			purpose: grant.purpose ?? null,
		});

	return {
		id: grant.id,
		title: grant.title,
		url: grant.url,
		internalUrl: `/grants/${grant.id}`,
		fitScore,
		explanation:
			override?.explanation ??
			`This grant matches your organization's profile with a fit score of ${fitScore.toFixed(1)}/10. ${grant.purpose || 'No description available.'}`,
		fundingAmount:
			grant.estimatedTotalFunding === null ||
			grant.estimatedTotalFunding === undefined
				? null
				: Number(grant.estimatedTotalFunding),
		estimatedTotalFunding:
			grant.estimatedTotalFunding === null ||
			grant.estimatedTotalFunding === undefined
				? null
				: Number(grant.estimatedTotalFunding),
		awardFloor:
			grant.awardFloor === null || grant.awardFloor === undefined
				? null
				: Number(grant.awardFloor),
		awardCeiling:
			grant.awardCeiling === null || grant.awardCeiling === undefined
				? null
				: Number(grant.awardCeiling),
		deadline: grant.deadline ? grant.deadline.toISOString() : null,
		daysUntilDeadline: calculateDaysUntilDeadline(grant.deadline ?? null),
		source: grant.source,
		detailsStatus: grant.detailsStatus,
		detailsFetchedAt: grant.detailsFetchedAt
			? grant.detailsFetchedAt.toISOString()
			: null,
		status: grant.status,
		closedAt: grant.closedAt ? grant.closedAt.toISOString() : null,
	};
};

const ensureBookmarkLimit = async (
	prismaClient: PrismaClient,
	userId: string,
) => {
	const count = await prismaClient.grantBookmark.count({
		where: { userId },
	});

	if (count >= BOOKMARK_LIMIT) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'BOOKMARK_LIMIT_REACHED',
		});
	}
};

const requireUserId = (ctx: {
	session?: { userId?: string | null } | null;
}) => {
	const userId = ctx.session?.userId ?? null;
	if (!userId) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}
	return userId;
};

const buildOrderBy = (sort: z.infer<typeof sortEnum>) => {
	switch (sort) {
		case 'FIT_DESC':
			// Will be re-sorted in memory using org-specific scores; keep deterministic tie-breaker.
			return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
		case 'DEADLINE_ASC':
			return [{ grant: { deadline: 'asc' as const } }, { id: 'desc' as const }];
		case 'DEADLINE_DESC':
			return [
				{ grant: { deadline: 'desc' as const } },
				{ id: 'desc' as const },
			];
		case 'TITLE_ASC':
			return [{ grant: { title: 'asc' as const } }, { id: 'desc' as const }];
		case 'AMOUNT_DESC':
			return [
				{ grant: { estimatedTotalFunding: 'desc' as const } },
				{ id: 'desc' as const },
			];
		default:
			return [{ createdAt: 'desc' as const }, { id: 'desc' as const }];
	}
};

export const bookmarkRouter = router({
	toggle: protectedProcedure
		.input(z.object({ grantId: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const userId = requireUserId(ctx);
			const prismaClient = ctx.prisma;

			const existing = await prismaClient.grantBookmark.findUnique({
				where: {
					userId_grantId: { userId, grantId: input.grantId },
				},
			});

			if (existing) {
				await prismaClient.grantBookmark.delete({
					where: { id: existing.id },
				});
				return { isBookmarked: false as const };
			}

			await ensureBookmarkLimit(prismaClient, userId);

			try {
				const bookmark = await prismaClient.grantBookmark.create({
					data: {
						userId,
						grantId: input.grantId,
						status: $Enums.BookmarkStatus.INTERESTED,
					},
				});

				return {
					isBookmarked: true as const,
					status: bookmark.status,
				};
			} catch (error) {
				if (
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2002'
				) {
					return {
						isBookmarked: true as const,
						status: $Enums.BookmarkStatus.INTERESTED,
					};
				}
				throw error;
			}
		}),

	setStatus: protectedProcedure
		.input(
			z.object({
				grantId: z.string(),
				status: bookmarkStatusSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = requireUserId(ctx);
			const prismaClient = ctx.prisma;

			const existing = await prismaClient.grantBookmark.findUnique({
				where: {
					userId_grantId: { userId, grantId: input.grantId },
				},
			});

			if (!existing) {
				await ensureBookmarkLimit(prismaClient, userId);
				const bookmark = await prismaClient.grantBookmark.create({
					data: {
						userId,
						grantId: input.grantId,
						status: input.status,
					},
				});

				return {
					isBookmarked: true as const,
					status: bookmark.status,
				};
			}

			const updated = await prismaClient.grantBookmark.update({
				where: { id: existing.id },
				data: { status: input.status },
			});

			return {
				isBookmarked: true as const,
				status: updated.status,
			};
		}),

	statusMap: protectedProcedure
		.input(z.object({ grantIds: z.array(z.string()) }))
		.query(async ({ ctx, input }) => {
			const prismaClient = ctx.prisma;
			const userId = requireUserId(ctx);
			if (input.grantIds.length === 0) {
				return {};
			}

			const bookmarks = await prismaClient.grantBookmark.findMany({
				where: {
					userId,
					grantId: { in: input.grantIds },
				},
				select: { grantId: true, status: true, tags: true },
			});

			return bookmarks.reduce(
				(acc, bookmark) => {
					acc[bookmark.grantId] = {
						isBookmarked: true as const,
						status: bookmark.status,
						tags: bookmark.tags,
					};
					return acc;
				},
				{} as Record<
					string,
					{
						isBookmarked: true;
						status: $Enums.BookmarkStatus;
						tags: string[];
					}
				>,
			);
		}),

	list: protectedProcedure
		.input(
			z
				.object({
					filters: z
						.object({
							bookmarkStatus: z.array(bookmarkStatusSchema).optional(),
							grantStatus: z.array(grantStatusSchema).optional(),
							search: z.string().optional(),
							tagsAny: z.array(z.string()).optional(),
							tagsAll: z.array(z.string()).optional(),
							hasNote: z.boolean().optional(),
						})
						.optional(),
					sort: sortEnum.default('BOOKMARKED_AT_DESC').optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const prismaClient = ctx.prisma;
			const userId = requireUserId(ctx);
			const organizationId = ctx.session?.organizationId ?? null;
			const filters = input?.filters;
			const sort = input?.sort ?? 'BOOKMARKED_AT_DESC';

			const tagsAny = normalizeTags(filters?.tagsAny);
			const tagsAll = normalizeTags(filters?.tagsAll);
			const searchTerm = filters?.search?.trim().toLowerCase();

			const bookmarks = await prismaClient.grantBookmark.findMany({
				where: {
					userId,
					...(filters?.bookmarkStatus
						? { status: { in: filters.bookmarkStatus } }
						: {}),
					...(filters?.grantStatus
						? { grant: { status: { in: filters.grantStatus } } }
						: {}),
					...(filters?.hasNote === true
						? { note: { not: null } }
						: filters?.hasNote === false
							? { note: null }
							: {}),
					...(tagsAny.length ? { tags: { hasSome: tagsAny } } : {}),
					...(tagsAll.length ? { tags: { hasEvery: tagsAll } } : {}),
				},
				orderBy: buildOrderBy(sort),
				include: { grant: { select: bookmarkGrantSelect } },
			});

			const filtered = searchTerm
				? bookmarks.filter((bookmark) => {
						const note = (bookmark.note ?? '').toLowerCase();
						const tagsText = bookmark.tags.join(' ').toLowerCase();
						const title = bookmark.grant.title.toLowerCase();
						const purpose = (bookmark.grant.purpose ?? '').toLowerCase();
						return (
							title.includes(searchTerm) ||
							purpose.includes(searchTerm) ||
							note.includes(searchTerm) ||
							tagsText.includes(searchTerm)
						);
					})
				: bookmarks;

			const grantIds = filtered.map((bookmark) => bookmark.grantId);
			let matchMap: Record<
				string,
				{
					fitScore: number;
					explanation: string | null;
					subscoresJson?: unknown;
				}
			> = {};

			if (organizationId && grantIds.length > 0) {
				await ensureGrantMatches({
					prisma: prismaClient,
					organizationId,
					grantIds,
				});

				const matches = await prismaClient.grantMatch.findMany({
					where: {
						organizationId,
						grantId: { in: grantIds },
					},
					select: {
						grantId: true,
						fitScore: true,
						explanation: true,
						subscoresJson: true,
					},
				});

				matchMap = matches.reduce<typeof matchMap>((acc, match) => {
					acc[match.grantId] = {
						fitScore: match.fitScore,
						explanation: match.explanation ?? null,
						subscoresJson: match.subscoresJson ?? undefined,
					};
					return acc;
				}, {});
			}

			const sorted =
				sort === 'FIT_DESC'
					? [...filtered].sort((a, b) => {
							const scoreA = matchMap[a.grantId]?.fitScore ?? null;
							const scoreB = matchMap[b.grantId]?.fitScore ?? null;
							if (scoreA === null && scoreB === null) return 0;
							if (scoreA === null) return 1;
							if (scoreB === null) return -1;
							if (scoreB !== scoreA) return scoreB - scoreA;
							return b.createdAt.getTime() - a.createdAt.getTime();
						})
					: filtered;

			return {
				items: sorted.map((bookmark) => {
					const match = matchMap[bookmark.grantId];
					return {
						id: bookmark.id,
						status: bookmark.status,
						createdAt: bookmark.createdAt,
						grantStatus: bookmark.grant.status,
						note: bookmark.note ?? null,
						tags: bookmark.tags,
						grant: mapGrantToMatch(bookmark.grant, {
							fitScore: match?.fitScore,
							explanation: match?.explanation ?? undefined,
						}),
					};
				}),
			};
		}),

	closedSummary: protectedProcedure.query(async ({ ctx }) => {
		const userId = requireUserId(ctx);
		const closedCount = await ctx.prisma.grantBookmark.count({
			where: {
				userId,
				grant: {
					status: $Enums.GrantStatus.CLOSED,
				},
			},
		});

		return { closedCount };
	}),

	removeClosed: protectedProcedure.mutation(async ({ ctx }) => {
		const userId = requireUserId(ctx);
		const result = await ctx.prisma.grantBookmark.deleteMany({
			where: {
				userId,
				grant: {
					status: $Enums.GrantStatus.CLOSED,
				},
			},
		});

		return { removedCount: result.count };
	}),

	updateMeta: protectedProcedure
		.input(
			z.object({
				grantId: z.string(),
				note: z.string().max(2000).nullable().optional(),
				tags: z.array(z.string()).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const userId = requireUserId(ctx);
			const prismaClient = ctx.prisma;
			const normalizedTags = normalizeTags(input.tags);
			const note = input.note === undefined ? undefined : (input.note ?? null);

			let bookmark = await prismaClient.grantBookmark.findUnique({
				where: {
					userId_grantId: { userId, grantId: input.grantId },
				},
			});

			if (!bookmark) {
				await ensureBookmarkLimit(prismaClient, userId);
				bookmark = await prismaClient.grantBookmark.create({
					data: {
						userId,
						grantId: input.grantId,
						status: $Enums.BookmarkStatus.INTERESTED,
						tags: normalizedTags,
						note: note ?? null,
					},
				});
				return {
					isBookmarked: true as const,
					status: bookmark.status,
					note: bookmark.note ?? null,
					tags: bookmark.tags,
				};
			}

			const updated = await prismaClient.grantBookmark.update({
				where: { id: bookmark.id },
				data: {
					...(input.tags !== undefined ? { tags: normalizedTags } : {}),
					...(note !== undefined ? { note } : {}),
				},
			});

			return {
				isBookmarked: true as const,
				status: updated.status,
				note: updated.note ?? null,
				tags: updated.tags,
			};
		}),

	getMyTags: protectedProcedure.query(async ({ ctx }) => {
		const userId = requireUserId(ctx);
		const prismaClient = ctx.prisma;

		const bookmarks = await prismaClient.grantBookmark.findMany({
			where: { userId },
			select: { tags: true, updatedAt: true },
		});

		const counts = new Map<
			string,
			{
				count: number;
				lastUsedAt: Date | null;
			}
		>();

		for (const bookmark of bookmarks) {
			for (const tag of bookmark.tags) {
				const entry = counts.get(tag);
				const lastUsedAt = bookmark.updatedAt ?? null;
				if (!entry) {
					counts.set(tag, { count: 1, lastUsedAt });
					continue;
				}
				counts.set(tag, {
					count: entry.count + 1,
					lastUsedAt:
						entry.lastUsedAt && entry.lastUsedAt > lastUsedAt
							? entry.lastUsedAt
							: lastUsedAt,
				});
			}
		}

		return Array.from(counts.entries())
			.map(([tag, info]) => ({
				tag,
				count: info.count,
				lastUsedAt: info.lastUsedAt,
			}))
			.sort((a, b) => {
				const aTime = a.lastUsedAt?.getTime() ?? 0;
				const bTime = b.lastUsedAt?.getTime() ?? 0;
				if (bTime !== aTime) return bTime - aTime;
				if (b.count !== a.count) return b.count - a.count;
				return a.tag.localeCompare(b.tag);
			});
	}),
});
