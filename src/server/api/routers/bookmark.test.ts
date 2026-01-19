import { beforeEach, describe, expect, it, vi } from 'vitest';
import { $Enums, type PrismaClient } from '@/prisma/generated/client';
import { bookmarkRouter } from './bookmark';

vi.hoisted(() => {
	process.env.DATABASE_URL =
		process.env.DATABASE_URL ?? 'postgres://user:pass@localhost:5432/testdb';
	process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'test-secret';
	process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? 'test-client';
	process.env.GOOGLE_CLIENT_SECRET =
		process.env.GOOGLE_CLIENT_SECRET ?? 'test-secret';
});

type TestBookmark = {
	id: string;
	userId: string;
	grantId: string;
	status: $Enums.BookmarkStatus;
	note: string | null;
	tags: string[];
	createdAt: Date;
	updatedAt: Date;
};

type TestGrant = {
	id: string;
	status: $Enums.GrantStatus;
	title: string;
	url: string;
	deadline: Date | null;
	source: $Enums.GrantSource;
	purpose: string | null;
	estimatedTotalFunding: bigint | null;
	awardFloor: bigint | null;
	awardCeiling: bigint | null;
	eligibleApplicants: string | null;
	eligibleGeographies: string | null;
	fitScore: number | null;
	fitScoreVersion: number | null;
	fitScoreComputedAt: Date | null;
	closedAt: Date | null;
	detailsStatus: $Enums.GrantDetailsStatus;
	detailsFetchedAt: Date | null;
};

const createPrismaMock = (store: {
	bookmarks: TestBookmark[];
	grants: TestGrant[];
}) => ({
	grantBookmark: {
		findFirst: ({
			where,
		}: {
			where: { id?: string; userId?: string };
		}) =>
			store.bookmarks.find((bookmark) => {
				if (where.id && bookmark.id !== where.id) return false;
				if (where.userId && bookmark.userId !== where.userId) return false;
				return true;
			}) ?? null,
		findUnique: ({
			where,
		}: {
			where: { userId_grantId: { userId: string; grantId: string } };
		}) =>
			store.bookmarks.find(
				(b) =>
					b.userId === where.userId_grantId.userId &&
					b.grantId === where.userId_grantId.grantId,
			) ?? null,
		count: ({ where }: { where: Record<string, unknown> }) =>
			store.bookmarks.filter((bookmark) => {
				if (where.userId && bookmark.userId !== where.userId) return false;
				if (
					where.status &&
					'grant' in where === false &&
					(typeof where.status === 'string'
						? bookmark.status !== where.status
						: Array.isArray((where.status as { in?: string[] }).in) &&
							!(where.status as { in?: string[] }).in?.includes(
								bookmark.status,
							))
				) {
					return false;
				}
				if (where.grant && typeof where.grant === 'object') {
					const grant = store.grants.find((g) => g.id === bookmark.grantId);
					const grantStatus = (
						where.grant as {
							status?: { in?: string[] } | string;
						}
					).status;
					if (grantStatus) {
						const statuses = Array.isArray(
							(grantStatus as { in?: string[] }).in,
						)
							? ((grantStatus as { in?: string[] }).in as string[])
							: [grantStatus as string];
						if (!statuses.includes(grant?.status ?? '')) return false;
					}
				}
				if ('note' in where) {
					if (where.note === null && bookmark.note !== null) return false;
					if (
						typeof where.note === 'object' &&
						(where.note as { not?: null }).not === null &&
						bookmark.note === null
					) {
						return false;
					}
				}
				if (where.tags && typeof where.tags === 'object') {
					const tagsWhere = where.tags as {
						hasSome?: string[];
						hasEvery?: string[];
					};
					if (tagsWhere.hasSome) {
						const hasSome = tagsWhere.hasSome.some((tag) =>
							bookmark.tags.includes(tag),
						);
						if (!hasSome) return false;
					}
					if (tagsWhere.hasEvery) {
						const hasAll = tagsWhere.hasEvery.every((tag) =>
							bookmark.tags.includes(tag),
						);
						if (!hasAll) return false;
					}
				}
				return true;
			}).length,
		create: ({ data }: { data: Partial<TestBookmark> }) => {
			const bookmark: TestBookmark = {
				id: `bm-${store.bookmarks.length + 1}`,
				userId: data.userId as string,
				grantId: data.grantId as string,
				status:
					(data.status as $Enums.BookmarkStatus) ??
					$Enums.BookmarkStatus.INTERESTED,
				note: (data.note as string | null | undefined) ?? null,
				tags: (data.tags as string[] | undefined) ?? [],
				createdAt: new Date(),
				updatedAt: new Date(),
			};
			store.bookmarks.push(bookmark);
			return bookmark;
		},
		delete: ({ where }: { where: { id: string } }) => {
			const index = store.bookmarks.findIndex(
				(bookmark) => bookmark.id === where.id,
			);
			const [deleted] = index >= 0 ? store.bookmarks.splice(index, 1) : [null];
			return deleted;
		},
		update: ({
			where,
			data,
		}: {
			where: { id: string };
			data: Partial<TestBookmark>;
		}) => {
			const bookmark = store.bookmarks.find((b) => b.id === where.id);
			if (!bookmark) throw new Error('Bookmark not found');
			Object.assign(bookmark, data, { updatedAt: new Date() });
			return bookmark;
		},
		findMany: ({
			where,
			include,
		}: {
			where: {
				userId?: string;
				grantId?: { in?: string[] };
			};
			select?: { grantId?: boolean; status?: boolean };
			include?: { grant?: { select: Record<string, boolean> } };
		}) => {
			let results = [...store.bookmarks];
			if (where?.userId) {
				results = results.filter(
					(bookmark) => bookmark.userId === where.userId,
				);
			}
			if (where?.grantId?.in) {
				results = results.filter((bookmark) =>
					where.grantId?.in?.includes(bookmark.grantId),
				);
			}
			if ((where as { note?: unknown }).note !== undefined) {
				const noteCond = (where as { note?: unknown }).note;
				results = results.filter((bookmark) => {
					if (noteCond === null) return bookmark.note === null;
					if (
						typeof noteCond === 'object' &&
						(noteCond as { not?: null }).not === null
					) {
						return bookmark.note !== null;
					}
					return true;
				});
			}
			if ((where as { tags?: unknown }).tags) {
				const tagsCond = (
					where as { tags?: { hasSome?: string[]; hasEvery?: string[] } }
				).tags;
				results = results.filter((bookmark) => {
					if (tagsCond?.hasSome) {
						const hasSome = tagsCond.hasSome.some((tag) =>
							bookmark.tags.includes(tag),
						);
						if (!hasSome) return false;
					}
					if (tagsCond?.hasEvery) {
						const hasAll = tagsCond.hasEvery.every((tag) =>
							bookmark.tags.includes(tag),
						);
						if (!hasAll) return false;
					}
					return true;
				});
			}
			return results.map((bookmark) => {
				if (include?.grant) {
					const grant = store.grants.find((g) => g.id === bookmark.grantId);
					return { ...bookmark, grant };
				}
				return bookmark;
			});
		},
		deleteMany: ({
			where,
		}: {
			where: {
				userId?: string;
				grant?: { status?: { in?: string[] } };
			};
		}) => {
			const before = store.bookmarks.length;
			store.bookmarks = store.bookmarks.filter((bookmark) => {
				if (where.userId && bookmark.userId !== where.userId) return true;
				if (where.grant?.status) {
					const grant = store.grants.find((g) => g.id === bookmark.grantId);
					const statuses = Array.isArray(
						(where.grant.status as { in?: string[] }).in,
					)
						? ((where.grant.status as { in?: string[] }).in as string[])
						: [where.grant.status as string];
					if (grant && statuses.includes(grant.status)) return false;
				}
				return true;
			});
			return { count: before - store.bookmarks.length };
		},
	},
	grant: {
		findUnique: ({ where }: { where: { id: string } }) =>
			store.grants.find((grant) => grant.id === where.id) ?? null,
	},
});

const state = {
	bookmarks: [] as TestBookmark[],
	grants: [] as TestGrant[],
};

const prismaMock = createPrismaMock(state);

const resetState = () => {
	state.bookmarks.length = 0;
	state.grants.length = 0;
};

const addGrant = (
	id: string,
	status: $Enums.GrantStatus = $Enums.GrantStatus.OPEN,
) => {
	state.grants.push({
		id,
		status,
		title: `Grant ${id}`,
		url: 'https://example.com',
		deadline: null,
		source: $Enums.GrantSource.CALIFORNIA,
		purpose: null,
		estimatedTotalFunding: null,
		awardFloor: null,
		awardCeiling: null,
		eligibleApplicants: null,
		eligibleGeographies: null,
		fitScore: null,
		fitScoreVersion: 1,
		fitScoreComputedAt: null,
		closedAt: null,
		detailsStatus: $Enums.GrantDetailsStatus.UNKNOWN,
		detailsFetchedAt: null,
	});
};

const createCaller = (userId = 'user-1') =>
	bookmarkRouter.createCaller({
		session: { userId, role: 'USER', organizationId: null },
		headers: new Headers(),
		prisma: prismaMock as unknown as PrismaClient,
	});

describe('bookmarkRouter', () => {
	beforeEach(() => {
		resetState();
	});

	it('creates and deletes a bookmark when toggled', async () => {
		addGrant('grant-1');
		const caller = createCaller();

		const created = await caller.toggle({ grantId: 'grant-1' });
		expect(created.isBookmarked).toBe(true);
		expect(state.bookmarks).toHaveLength(1);
		expect(state.bookmarks[0]?.status).toBe($Enums.BookmarkStatus.INTERESTED);

		const deleted = await caller.toggle({ grantId: 'grant-1' });
		expect(deleted.isBookmarked).toBe(false);
		expect(state.bookmarks).toHaveLength(0);
	});

	it('enforces a 100-bookmark limit', async () => {
		addGrant('grant-limit');
		for (let i = 0; i < 100; i++) {
			const grantId = `grant-${i}`;
			addGrant(grantId);
			state.bookmarks.push({
				id: `bm-${i}`,
				userId: 'user-1',
				grantId,
				status: $Enums.BookmarkStatus.INTERESTED,
				note: null,
				tags: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		const caller = createCaller();
		await expect(caller.toggle({ grantId: 'grant-limit' })).rejects.toThrow(
			/BOOKMARK_LIMIT_REACHED/,
		);
	});

	it('removes only closed grant bookmarks', async () => {
		addGrant('open', $Enums.GrantStatus.OPEN);
		addGrant('closed-1', $Enums.GrantStatus.CLOSED);
		addGrant('closed-2', $Enums.GrantStatus.CLOSED);

		state.bookmarks.push(
			{
				id: 'bm-1',
				userId: 'user-1',
				grantId: 'open',
				status: $Enums.BookmarkStatus.INTERESTED,
				note: null,
				tags: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'bm-2',
				userId: 'user-1',
				grantId: 'closed-1',
				status: $Enums.BookmarkStatus.APPLIED,
				note: null,
				tags: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'bm-3',
				userId: 'user-1',
				grantId: 'closed-2',
				status: $Enums.BookmarkStatus.NOT_FOR_US,
				note: null,
				tags: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);

		const caller = createCaller();
		const result = await caller.removeClosed();
		expect(result.removedCount).toBe(2);
		expect(state.bookmarks).toHaveLength(1);
		expect(state.bookmarks[0]?.grantId).toBe('open');
	});

	it('creates bookmark with tags and note via updateMeta', async () => {
		addGrant('grant-meta', $Enums.GrantStatus.OPEN);
		const caller = createCaller();

		const result = await caller.updateMeta({
			grantId: 'grant-meta',
			note: 'Test note',
			tags: ['Education', '  STEM  '],
		});

		expect(result.isBookmarked).toBe(true);
		expect(result.status).toBe($Enums.BookmarkStatus.INTERESTED);
		expect(result.note).toBe('Test note');
		expect(result.tags).toEqual(['education', 'stem']);
	});

	it('normalizes and dedupes tags, enforcing limit', async () => {
		addGrant('grant-tags', $Enums.GrantStatus.OPEN);
		const caller = createCaller();

		await caller.updateMeta({
			grantId: 'grant-tags',
			tags: ['One', 'one', 'Two', 'Three'],
		});

		expect(state.bookmarks[0]?.tags).toEqual(['one', 'two', 'three']);

		const tooMany = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
		await expect(
			caller.updateMeta({ grantId: 'grant-tags', tags: tooMany }),
		).rejects.toThrow();
	});

	it('enforces bookmark limit when creating via updateMeta', async () => {
		for (let i = 0; i < 100; i++) {
			const grantId = `limit-${i}`;
			addGrant(grantId);
			state.bookmarks.push({
				id: `bm-limit-${i}`,
				userId: 'user-1',
				grantId,
				status: $Enums.BookmarkStatus.INTERESTED,
				note: null,
				tags: [],
				createdAt: new Date(),
				updatedAt: new Date(),
			});
		}

		addGrant('over-limit');
		const caller = createCaller();
		await expect(
			caller.updateMeta({ grantId: 'over-limit', tags: ['test'] }),
		).rejects.toThrow(/BOOKMARK_LIMIT_REACHED/);
	});

	it('rejects notes longer than 2000 characters', async () => {
		addGrant('grant-note', $Enums.GrantStatus.OPEN);
		const caller = createCaller();
		const longNote = 'x'.repeat(2001);
		await expect(
			caller.updateMeta({ grantId: 'grant-note', note: longNote }),
		).rejects.toThrow();
	});

	it('adds and removes tags via tag mutations', async () => {
		addGrant('grant-tags', $Enums.GrantStatus.OPEN);
		state.bookmarks.push({
			id: 'bm-tags',
			userId: 'user-1',
			grantId: 'grant-tags',
			status: $Enums.BookmarkStatus.INTERESTED,
			note: null,
			tags: ['initial'],
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const caller = createCaller();
		const added = await caller.addTag({
			bookmarkId: 'bm-tags',
			tag: '  New Tag ',
		});
		expect(added.tags).toEqual(['initial', 'new tag']);

		const removed = await caller.removeTag({
			bookmarkId: 'bm-tags',
			tag: 'Initial',
		});
		expect(removed.tags).toEqual(['new tag']);
	});

	it('filters bookmarks by tagsAny and tagsAll', async () => {
		addGrant('tag-a', $Enums.GrantStatus.OPEN);
		addGrant('tag-b', $Enums.GrantStatus.OPEN);
		state.bookmarks.push(
			{
				id: 'bm-a',
				userId: 'user-1',
				grantId: 'tag-a',
				status: $Enums.BookmarkStatus.INTERESTED,
				note: null,
				tags: ['education', 'stem'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
			{
				id: 'bm-b',
				userId: 'user-1',
				grantId: 'tag-b',
				status: $Enums.BookmarkStatus.INTERESTED,
				note: null,
				tags: ['health'],
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);

		const caller = createCaller();
		const anyResult = await caller.list({
			filters: { tagsAny: ['stem'] },
		});
		expect(anyResult.items).toHaveLength(1);
		expect(anyResult.items[0]?.id).toBe('bm-a');

		const allResult = await caller.list({
			filters: { tagsAll: ['education', 'stem'] },
		});
		expect(allResult.items).toHaveLength(1);
		expect(allResult.items[0]?.id).toBe('bm-a');
	});
});
