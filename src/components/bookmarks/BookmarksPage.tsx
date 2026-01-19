// /src/components/bookmarks/BookmarksPage.tsx

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import type { BookmarkSort, BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import { GrantCard } from '@/components/grants/GrantCard';
import { BookmarkButton } from '@/components/grants/BookmarkButton';
import { BookmarkStatusSelect } from '@/components/grants/BookmarkStatusSelect';
import { Pagination } from '@/components/grants/Pagination';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { buildReturnTo } from '@/lib/utils/return-to';
import {
	applyBookmarkFiltersToParams,
	parseBookmarkFilters,
} from '@/lib/utils/bookmark-filters';
import { BookmarkFilters } from '@/components/bookmarks/BookmarkFilters';
import { TagFacets } from '@/components/bookmarks/TagFacets';
import { BookmarkCardExtras } from '@/components/bookmarks/BookmarkCardExtras';
import { Button } from '@/components/ui/button';

const needsFollowUpTag = 'needs follow-up';

const sortLabels: Record<BookmarkSort, string> = {
	BOOKMARKED_AT_DESC: 'Bookmarked (newest)',
	DEADLINE_ASC: 'Deadline ↑',
	DEADLINE_DESC: 'Deadline ↓',
	TITLE_ASC: 'Title A–Z',
	AMOUNT_DESC: 'Amount ↓',
};

const normalizeQueryString = (params: URLSearchParams) => {
	const entries = Array.from(params.entries()).sort(([keyA, valueA], [keyB, valueB]) => {
		if (keyA !== keyB) return keyA.localeCompare(keyB);
		return valueA.localeCompare(valueB);
	});
	const normalized = new URLSearchParams();
	for (const [key, value] of entries) {
		normalized.append(key, value);
	}
	return normalized.toString();
};

export function BookmarksPage() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const searchParamsString = searchParams?.toString() ?? '';
	const initialFilters = useMemo(
		() => parseBookmarkFilters(new URLSearchParams(searchParamsString)),
		[searchParamsString],
	);
	const [search, setSearch] = useState(initialFilters.search);
	const [bookmarkStatus, setBookmarkStatus] = useState<
		BookmarkStatus | 'ALL'
	>(initialFilters.bookmarkStatus);
	const [grantStatus, setGrantStatus] = useState<
		'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN'
	>(initialFilters.grantStatus);
	const [sort, setSort] = useState<BookmarkSort>(initialFilters.sort);
	const [page, setPage] = useState(1);
	const pageSize = 10;
	const [selectedTags, setSelectedTags] = useState<string[]>(
		initialFilters.tags,
	);
	const [tagMatchMode, setTagMatchMode] = useState<'ANY' | 'ALL'>(
		initialFilters.tagMatchMode,
	);
	const [hasNoteFilter, setHasNoteFilter] = useState<'ALL' | 'HAS' | 'NONE'>(
		initialFilters.hasNote,
	);
	const lastWrittenQueryRef = useRef<string | null>(null);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [notesOpenById, setNotesOpenById] = useState<Record<string, boolean>>(
		{},
	);

	useEffect(() => {
		try {
			const stored = sessionStorage.getItem('bookmarks.filtersOpen');
			setFiltersOpen(stored === 'true');
		} catch {
			setFiltersOpen(false);
		}
	}, []);

	const handleToggleFilters = () => {
		setFiltersOpen((prev) => {
			const next = !prev;
			try {
				sessionStorage.setItem('bookmarks.filtersOpen', String(next));
			} catch {
				// ignore storage failures
			}
			return next;
		});
	};

	const clearFilters = () => {
		setSearch('');
		setBookmarkStatus('ALL');
		setGrantStatus('ALL');
		setSort('BOOKMARKED_AT_DESC');
		setSelectedTags([]);
		setTagMatchMode('ANY');
		setHasNoteFilter('ALL');
	};
	useEffect(() => {
		const normalizedQuery = normalizeQueryString(
			new URLSearchParams(searchParamsString),
		);
		if (normalizedQuery === lastWrittenQueryRef.current) {
			lastWrittenQueryRef.current = null;
			return;
		}
		const parsed = parseBookmarkFilters(
			new URLSearchParams(searchParamsString),
		);
		setSearch(parsed.search);
		setBookmarkStatus(parsed.bookmarkStatus);
		setGrantStatus(parsed.grantStatus);
		setSort(parsed.sort);
		setSelectedTags(parsed.tags);
		setTagMatchMode(parsed.tagMatchMode);
		setHasNoteFilter(parsed.hasNote);
	}, [searchParamsString]);

	useEffect(() => {
		const nextParams = applyBookmarkFiltersToParams(
			new URLSearchParams(searchParamsString),
			{
			search,
			bookmarkStatus,
			grantStatus,
			sort,
			tags: selectedTags,
			tagMatchMode,
			hasNote: hasNoteFilter,
		},
		);
		const nextQuery = normalizeQueryString(nextParams);
		const currentQuery = normalizeQueryString(
			new URLSearchParams(searchParamsString),
		);
		if (nextQuery === currentQuery) return;
		lastWrittenQueryRef.current = nextQuery;
		const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
		router.replace(url);
	}, [
		search,
		bookmarkStatus,
		grantStatus,
		sort,
		selectedTags,
		tagMatchMode,
		hasNoteFilter,
		pathname,
		router,
		searchParamsString,
	]);

	const filtersInput =
		bookmarkStatus !== 'ALL' ||
		grantStatus !== 'ALL' ||
		search.trim() ||
		selectedTags.length > 0 ||
		hasNoteFilter !== 'ALL'
			? {
					bookmarkStatus:
						bookmarkStatus !== 'ALL' ? [bookmarkStatus] : undefined,
					grantStatus: grantStatus !== 'ALL' ? [grantStatus] : undefined,
					search: search.trim() || undefined,
					tagsAny:
						selectedTags.length && tagMatchMode === 'ANY'
							? selectedTags
							: undefined,
					tagsAll:
						selectedTags.length && tagMatchMode === 'ALL'
							? selectedTags
							: undefined,
					hasNote:
						hasNoteFilter === 'HAS'
							? true
							: hasNoteFilter === 'NONE'
								? false
								: undefined,
				}
			: undefined;

	const listQuery = trpc.bookmark.list.useQuery(
		{ filters: filtersInput, sort },
		{
			refetchOnWindowFocus: false,
		},
	);

	const bookmarks = listQuery.data?.items ?? [];
	const {
		data: closedSummary,
		refetch: refetchClosedSummary,
		isFetching: isClosedSummaryLoading,
	} = trpc.bookmark.closedSummary.useQuery();

	const removeClosed = trpc.bookmark.removeClosed.useMutation({
		onSuccess: (data) => {
			toast.success(`Removed ${data.removedCount} closed grants`);
			listQuery.refetch();
			refetchClosedSummary();
		},
		onError: () => {
			toast.error('Could not remove closed grants. Please try again.');
		},
	});

	const returnTo = buildReturnTo(pathname, searchParamsString);

	const filterKey = useMemo(
		() =>
			[
				search,
				bookmarkStatus,
				grantStatus,
				sort,
				selectedTags.join(','),
				tagMatchMode,
				hasNoteFilter,
			].join('|'),
		[
			search,
			bookmarkStatus,
			grantStatus,
			sort,
			selectedTags,
			tagMatchMode,
			hasNoteFilter,
		],
	);

	useEffect(() => {
		void filterKey;
		setPage(1);
	}, [filterKey]);

	const total = bookmarks.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);
	const paginated = bookmarks.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize,
	);

	const tagFacets = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bookmark of bookmarks) {
			for (const tag of bookmark.tags ?? []) {
				counts.set(tag, (counts.get(tag) ?? 0) + 1);
			}
		}
		for (const tag of selectedTags) {
			if (!counts.has(tag)) counts.set(tag, 0);
		}
		return Array.from(counts.entries())
			.map(([tag, count]) => ({ tag, count }))
			.sort((a, b) => {
				if (b.count !== a.count) return b.count - a.count;
				return a.tag.localeCompare(b.tag);
			});
	}, [bookmarks, selectedTags]);

	const primaryFacets = tagFacets.slice(0, 12);
	const overflowFacets = tagFacets.slice(12);

	const savedViewValue = useMemo(() => {
		if (
			bookmarkStatus === 'ALL' &&
			selectedTags.length === 1 &&
			selectedTags[0] === needsFollowUpTag
		) {
			return 'NEEDS_FOLLOW_UP';
		}
		if (selectedTags.length === 0) {
			if (bookmarkStatus === 'ALL') return 'ALL';
			if (bookmarkStatus === 'INTERESTED') return 'INTERESTED';
			if (bookmarkStatus === 'APPLIED') return 'APPLIED';
			if (bookmarkStatus === 'NOT_FOR_US') return 'NOT_FOR_US';
		}
		return 'CUSTOM';
	}, [bookmarkStatus, selectedTags]);

	const filterSummary = useMemo(() => {
		const parts: string[] = [];
		const trimmedSearch = search.trim();
		if (trimmedSearch) {
			parts.push(`Search: ${trimmedSearch}`);
		}
		if (bookmarkStatus !== 'ALL') {
			parts.push(`Status: ${BOOKMARK_STATUS_LABELS[bookmarkStatus]}`);
		}
		if (grantStatus !== 'ALL') {
			parts.push(`Grant: ${grantStatus.toLowerCase()}`);
		}
		if (selectedTags.length > 0) {
			const previewTags = selectedTags.slice(0, 2);
			const extra = selectedTags.length - previewTags.length;
			parts.push(
				`Tags: ${previewTags.join(', ')}${extra > 0 ? ` +${extra}` : ''}`,
			);
		}
		if (selectedTags.length > 0 && tagMatchMode === 'ALL') {
			parts.push('Tag match: all');
		}
		if (hasNoteFilter === 'HAS') {
			parts.push('Notes: with notes');
		}
		if (hasNoteFilter === 'NONE') {
			parts.push('Notes: without notes');
		}
		if (sort !== 'BOOKMARKED_AT_DESC') {
			parts.push(`Sort: ${sortLabels[sort]}`);
		}
		return parts.length > 0 ? `Filters: ${parts.join(' · ')}` : 'Filters: none';
	}, [
		search,
		bookmarkStatus,
		grantStatus,
		selectedTags,
		tagMatchMode,
		hasNoteFilter,
		sort,
	]);

	const handleSavedViewChange = (value: string) => {
		if (value === 'ALL') {
			setBookmarkStatus('ALL');
			setSelectedTags([]);
			setTagMatchMode('ANY');
			return;
		}
		if (value === 'INTERESTED') {
			setBookmarkStatus('INTERESTED');
			setSelectedTags([]);
			setTagMatchMode('ANY');
			return;
		}
		if (value === 'APPLIED') {
			setBookmarkStatus('APPLIED');
			setSelectedTags([]);
			setTagMatchMode('ANY');
			return;
		}
		if (value === 'NOT_FOR_US') {
			setBookmarkStatus('NOT_FOR_US');
			setSelectedTags([]);
			setTagMatchMode('ANY');
			return;
		}
		if (value === 'NEEDS_FOLLOW_UP') {
			setBookmarkStatus('ALL');
			setSelectedTags([needsFollowUpTag]);
			setTagMatchMode('ANY');
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Saved Grants</h1>
				<p className="text-sm text-muted-foreground">
					You have {total} bookmarked grant{total === 1 ? '' : 's'}
					{closedSummary?.closedCount
						? ` • ${closedSummary.closedCount} closed`
						: ''}
					.
				</p>
			</div>

			<div className="rounded-md border bg-card p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="text-sm text-muted-foreground">{filterSummary}</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={clearFilters}>
							Clear
						</Button>
						<Button variant="secondary" size="sm" onClick={handleToggleFilters}>
							{filtersOpen ? 'Hide filters' : 'Show filters'}
							<ChevronDown
								className={`ml-2 h-4 w-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
							/>
						</Button>
					</div>
				</div>
				{filtersOpen && (
					<div className="mt-4 space-y-3">
						<BookmarkFilters
							search={search}
							bookmarkStatus={bookmarkStatus}
							grantStatus={grantStatus}
							sort={sort}
							hasNoteFilter={hasNoteFilter}
							onSearchChange={setSearch}
							onBookmarkStatusChange={setBookmarkStatus}
							onGrantStatusChange={setGrantStatus}
							onSortChange={setSort}
							onHasNoteFilterChange={setHasNoteFilter}
							onRemoveClosed={() => {
								const count = closedSummary?.closedCount ?? 0;
								if (count === 0) return;
								toast.message(`Remove ${count} closed grant(s)?`, {
									action: {
										label: 'Confirm',
										onClick: () => removeClosed.mutate(),
									},
								});
							}}
							removeClosedCount={closedSummary?.closedCount ?? 0}
							removeClosedPending={removeClosed.isPending}
							isClosedSummaryLoading={isClosedSummaryLoading}
						/>

						<TagFacets
							tagFacets={primaryFacets}
							overflowFacets={overflowFacets}
							selectedTags={selectedTags}
							tagMatchMode={tagMatchMode}
							savedViewValue={savedViewValue}
							onToggleTag={(tag) => {
								setSelectedTags((prev) =>
									prev.includes(tag)
										? prev.filter((t) => t !== tag)
										: [...prev, tag],
								);
							}}
							onClearTags={() => {
								setSelectedTags([]);
								setTagMatchMode('ANY');
							}}
							onTagMatchModeChange={setTagMatchMode}
							onSavedViewChange={handleSavedViewChange}
						/>
					</div>
				)}
			</div>

			{listQuery.isLoading ? (
				<div className="flex justify-center py-12">
					<span className="text-sm text-muted-foreground">Loading...</span>
				</div>
			) : bookmarks.length === 0 ? (
				<p className="text-center py-12 text-muted-foreground">
					No bookmarked grants yet.
				</p>
			) : (
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{paginated.map((bookmark) => {
							const hasNote = (bookmark.note ?? '').trim().length > 0;
							const defaultOpen = hasNote;
							const isOpen =
								notesOpenById[bookmark.id] ?? defaultOpen;
							return (
								<div key={bookmark.id} className="space-y-3">
									<GrantCard
										grant={bookmark.grant}
										summaryTags={bookmark.tags}
										returnTo={returnTo}
										actionSlot={
											<div className="flex flex-col items-end gap-2">
												<BookmarkStatusSelect
													grantId={bookmark.grant.id}
													status={bookmark.status as BookmarkStatus}
													statusMapInput={{ grantIds: [bookmark.grant.id] }}
												/>
												<BookmarkButton
													grantId={bookmark.grant.id}
													isBookmarked
													status={bookmark.status}
													statusMapInput={{ grantIds: [bookmark.grant.id] }}
												/>
											</div>
										}
									/>
									<BookmarkCardExtras
										grantId={bookmark.grant.id}
										initialNote={bookmark.note}
										initialTags={bookmark.tags}
										isOpen={isOpen}
										onOpenChange={(open) =>
											setNotesOpenById((prev) => ({
												...prev,
												[bookmark.id]: open,
											}))
										}
										onSaved={() =>
											setNotesOpenById((prev) => ({
												...prev,
												[bookmark.id]: true,
											}))
										}
									/>
								</div>
							);
						})}
					</div>
					<Pagination
						page={currentPage}
						pageSize={pageSize}
						total={total}
						onPageChange={setPage}
					/>
				</div>
			)}
		</div>
	);
}
