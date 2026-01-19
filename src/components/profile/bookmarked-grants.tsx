'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import {
	BOOKMARK_STATUS_LABELS,
	type BookmarkSort,
	type BookmarkStatus,
} from '@/lib/types/bookmark';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { GrantCard } from '@/components/grants/GrantCard';
import { BookmarkButton } from '@/components/grants/BookmarkButton';
import { BookmarkStatusSelect } from '@/components/grants/BookmarkStatusSelect';
import { Pagination } from '@/components/grants/Pagination';
import { BookmarkMetaEditor } from '@/components/grants/BookmarkMetaEditor';
import { Badge } from '@/components/ui/badge';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	applyBookmarkFiltersToParams,
	parseBookmarkFilters,
} from '@/lib/utils/bookmark-filters';
import { buildReturnTo } from '@/lib/utils/return-to';

const sortOptions: { value: BookmarkSort; label: string }[] = [
	{ value: 'BOOKMARKED_AT_DESC', label: 'Bookmarked (newest)' },
	{ value: 'DEADLINE_ASC', label: 'Deadline ↑' },
	{ value: 'DEADLINE_DESC', label: 'Deadline ↓' },
	{ value: 'TITLE_ASC', label: 'Title A–Z' },
	{ value: 'AMOUNT_DESC', label: 'Amount ↓' },
];

const needsFollowUpTag = 'needs follow-up';
const tagsEqual = (a: string[], b: string[]) =>
	a.length === b.length && a.every((tag, index) => tag === b[index]);
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

export function BookmarkedGrants() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const initialFilters = useMemo(
		() => parseBookmarkFilters(searchParams),
		[searchParams],
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
	const searchId = 'bookmarked-grants-search';
	const bookmarkStatusId = 'bookmarked-grants-status';
	const grantStatusId = 'bookmarked-grants-grant-status';
	const sortId = 'bookmarked-grants-sort';
	const tagFilterId = 'bookmarked-grants-tag-filter';
	const tagModeId = 'bookmarked-grants-tag-mode';
	const noteFilterId = 'bookmarked-grants-note-filter';
	const savedViewId = 'bookmarked-grants-saved-view';
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
	const lastSyncedQueryRef = useRef<string | null>(null);
	const searchParamsString = searchParams?.toString() ?? '';

	useEffect(() => {
		const normalizedQuery = normalizeQueryString(
			new URLSearchParams(searchParamsString),
		);
		if (normalizedQuery === lastWrittenQueryRef.current) {
			lastSyncedQueryRef.current = normalizedQuery;
			return;
		}
		if (normalizedQuery === lastSyncedQueryRef.current) return;
		const parsed = parseBookmarkFilters(searchParams);
		if (search !== parsed.search) setSearch(parsed.search);
		if (bookmarkStatus !== parsed.bookmarkStatus) {
			setBookmarkStatus(parsed.bookmarkStatus);
		}
		if (grantStatus !== parsed.grantStatus) {
			setGrantStatus(parsed.grantStatus);
		}
		if (sort !== parsed.sort) setSort(parsed.sort);
		if (!tagsEqual(selectedTags, parsed.tags)) {
			setSelectedTags(parsed.tags);
		}
		if (tagMatchMode !== parsed.tagMatchMode) {
			setTagMatchMode(parsed.tagMatchMode);
		}
		if (hasNoteFilter !== parsed.hasNote) {
			setHasNoteFilter(parsed.hasNote);
		}
		lastSyncedQueryRef.current = normalizedQuery;
	}, [
		searchParamsString,
		searchParams,
		search,
		bookmarkStatus,
		grantStatus,
		sort,
		selectedTags,
		tagMatchMode,
		hasNoteFilter,
	]);

	useEffect(() => {
		const nextParams = applyBookmarkFiltersToParams(searchParams, {
			search,
			bookmarkStatus,
			grantStatus,
			sort,
			tags: selectedTags,
			tagMatchMode,
			hasNote: hasNoteFilter,
		});
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
		searchParams,
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

	const returnTo = buildReturnTo(pathname, searchParams?.toString() ?? '');

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

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
					<div className="flex flex-col gap-2">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={searchId}
						>
							Search
						</Label>
						<Input
							id={searchId}
							placeholder="Search bookmarked grants"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							className="w-full md:w-[240px]"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={bookmarkStatusId}
						>
							Bookmark status
						</Label>
						<Select
							value={bookmarkStatus}
							onValueChange={(value) =>
								setBookmarkStatus(value as BookmarkStatus | 'ALL')
							}
						>
							<SelectTrigger
								className="md:w-[200px]"
								id={bookmarkStatusId}
								aria-labelledby={bookmarkStatusId}
							>
								<SelectValue placeholder="All statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All statuses</SelectItem>
								<SelectItem value="INTERESTED">
									{BOOKMARK_STATUS_LABELS.INTERESTED}
								</SelectItem>
								<SelectItem value="APPLIED">
									{BOOKMARK_STATUS_LABELS.APPLIED}
								</SelectItem>
								<SelectItem value="NOT_FOR_US">
									{BOOKMARK_STATUS_LABELS.NOT_FOR_US}
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={grantStatusId}
						>
							Grant status
						</Label>
						<Select
							value={grantStatus}
							onValueChange={(value) =>
								setGrantStatus(value as 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN')
							}
						>
							<SelectTrigger
								className="md:w-[200px]"
								id={grantStatusId}
								aria-labelledby={grantStatusId}
							>
								<SelectValue placeholder="All grant statuses" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All grant statuses</SelectItem>
								<SelectItem value="OPEN">Open</SelectItem>
								<SelectItem value="CLOSED">Closed</SelectItem>
								<SelectItem value="UNKNOWN">Unknown</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={sortId}
						>
							Sort
						</Label>
						<Select
							value={sort}
							onValueChange={(value) => setSort(value as BookmarkSort)}
						>
							<SelectTrigger
								className="md:w-[200px]"
								id={sortId}
								aria-labelledby={sortId}
							>
								<SelectValue placeholder="Sort" />
							</SelectTrigger>
							<SelectContent>
								{sortOptions.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={noteFilterId}
						>
							Notes
						</Label>
						<Select
							value={hasNoteFilter}
							onValueChange={(value) =>
								setHasNoteFilter(value as 'ALL' | 'HAS' | 'NONE')
							}
						>
							<SelectTrigger
								className="md:w-[200px]"
								id={noteFilterId}
								aria-labelledby={noteFilterId}
							>
								<SelectValue placeholder="Note filter" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ALL">All</SelectItem>
								<SelectItem value="HAS">With notes</SelectItem>
								<SelectItem value="NONE">Without notes</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				<Button
					variant="secondary"
					className="self-start"
					disabled={
						removeClosed.isPending ||
						isClosedSummaryLoading ||
						!closedSummary?.closedCount
					}
					onClick={() => {
						const count = closedSummary?.closedCount ?? 0;
						if (count === 0) return;
						toast.message(`Remove ${count} closed grant(s)?`, {
							action: {
								label: 'Confirm',
								onClick: () => removeClosed.mutate(),
							},
						});
					}}
				>
					{removeClosed.isPending ? (
						<>
							<Loader2 className="animate-spin" />
							Removing…
						</>
					) : (
						<>
							Remove closed grants (
							{closedSummary?.closedCount?.toString() ?? '0'})
						</>
					)}
				</Button>
			</div>

			<div className="space-y-2">
				<div className="flex flex-wrap items-center gap-3">
					<Label
						className="text-sm font-medium text-muted-foreground"
						htmlFor={tagFilterId}
					>
						Tag facets
					</Label>
					<div className="flex flex-wrap gap-2" id={tagFilterId}>
						{tagFacets.length ? (
							primaryFacets.map((facet) => {
								const isActive = selectedTags.includes(facet.tag);
								return (
									<Button
										key={facet.tag}
										variant={isActive ? 'secondary' : 'outline'}
										size="sm"
										onClick={() => {
											setSelectedTags((prev) =>
												prev.includes(facet.tag)
													? prev.filter((t) => t !== facet.tag)
													: [...prev, facet.tag],
											);
										}}
									>
										{facet.tag}
										<Badge variant="secondary" className="ml-2">
											{facet.count}
										</Badge>
									</Button>
								);
							})
						) : (
							<span className="text-sm text-muted-foreground">
								No tags yet. Add some from bookmark notes.
							</span>
						)}
						{overflowFacets.length > 0 && (
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="outline" size="sm">
										More...
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="start" className="w-48">
									{overflowFacets.map((facet) => {
										const isActive = selectedTags.includes(facet.tag);
										return (
											<DropdownMenuItem
												key={facet.tag}
												onClick={() => {
													setSelectedTags((prev) =>
														prev.includes(facet.tag)
															? prev.filter((t) => t !== facet.tag)
															: [...prev, facet.tag],
													);
												}}
											>
												<span className="flex-1">{facet.tag}</span>
												<span
													className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
												>
													{facet.count}
												</span>
											</DropdownMenuItem>
										);
									})}
								</DropdownMenuContent>
							</DropdownMenu>
						)}
						{selectedTags.length > 0 && (
							<Button
								variant="ghost"
								size="sm"
								onClick={() => {
									setSelectedTags([]);
									setTagMatchMode('ANY');
								}}
							>
								Clear tags
							</Button>
						)}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-3">
					<Label
						className="text-sm font-medium text-muted-foreground"
						htmlFor={savedViewId}
					>
						Saved view
					</Label>
					<Select
						value={savedViewValue}
						onValueChange={(value) => {
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
								return;
							}
						}}
					>
						<SelectTrigger
							className="w-[200px]"
							id={savedViewId}
							aria-labelledby={savedViewId}
						>
							<SelectValue placeholder="Saved views" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">All bookmarked</SelectItem>
							<SelectItem value="INTERESTED">
								{BOOKMARK_STATUS_LABELS.INTERESTED}
							</SelectItem>
							<SelectItem value="APPLIED">
								{BOOKMARK_STATUS_LABELS.APPLIED}
							</SelectItem>
							<SelectItem value="NOT_FOR_US">
								{BOOKMARK_STATUS_LABELS.NOT_FOR_US}
							</SelectItem>
							<SelectItem value="NEEDS_FOLLOW_UP">Needs follow-up</SelectItem>
							<SelectItem value="CUSTOM" disabled>
								Custom
							</SelectItem>
						</SelectContent>
					</Select>
				</div>
				{selectedTags.length > 0 && (
					<div className="flex flex-wrap items-center gap-3">
						<Label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={tagModeId}
						>
							Tag match
						</Label>
						<Select
							value={tagMatchMode}
							onValueChange={(value) => setTagMatchMode(value as 'ANY' | 'ALL')}
						>
							<SelectTrigger
								className="w-[200px]"
								id={tagModeId}
								aria-labelledby={tagModeId}
							>
								<SelectValue placeholder="Match mode" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="ANY">Match any selected tag</SelectItem>
								<SelectItem value="ALL">Match all selected tags</SelectItem>
							</SelectContent>
						</Select>
					</div>
				)}
			</div>

			{listQuery.isLoading ? (
				<div className="flex justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			) : bookmarks.length === 0 ? (
				<p className="text-center py-12 text-muted-foreground">
					No bookmarked grants yet.
				</p>
			) : (
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{paginated.map((bookmark) => (
							<div key={bookmark.id} className="space-y-3">
								<GrantCard
									grant={bookmark.grant}
									summaryTags={bookmark.tags}
									returnTo={returnTo}
									actionSlot={
										<div className="flex flex-col items-end gap-2">
											<BookmarkButton
												grantId={bookmark.grant.id}
												isBookmarked
												status={bookmark.status}
												statusMapInput={{ grantIds: [bookmark.grant.id] }}
											/>
											<BookmarkStatusSelect
												grantId={bookmark.grant.id}
												status={bookmark.status as BookmarkStatus}
												statusMapInput={{ grantIds: [bookmark.grant.id] }}
											/>
										</div>
									}
								/>
								<BookmarkMetaEditor
									grantId={bookmark.grant.id}
									initialNote={bookmark.note}
									initialTags={bookmark.tags}
								/>
							</div>
						))}
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
