// /src/components/bookmarks/BookmarksPage.tsx

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import type { BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import { GrantCard } from '@/components/grants/GrantCard';
import { BookmarkButton } from '@/components/grants/BookmarkButton';
import { BookmarkStatusSelect } from '@/components/grants/BookmarkStatusSelect';
import { Pagination } from '@/components/grants/Pagination';
import { usePathname } from 'next/navigation';
import { buildReturnTo } from '@/lib/utils/return-to';
import { BookmarkFilters } from '@/components/bookmarks/BookmarkFilters';
import { TagFacets } from '@/components/bookmarks/TagFacets';
import { BookmarkCardExtras } from '@/components/bookmarks/BookmarkCardExtras';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { DEFAULT_SAVED_VIEWS } from '@/lib/bookmarks/saved-views';
import { BulkActionBar } from '@/components/bookmarks/BulkActionBar';
import { useBookmarkFilters } from '@/components/bookmarks/useBookmarkFilters';
import { defaultBookmarkFilters } from '@/lib/utils/bookmark-filters';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const sortLabels = {
	BOOKMARKED_AT_DESC: 'Bookmarked (newest)',
	DEADLINE_ASC: 'Deadline ↑',
	DEADLINE_DESC: 'Deadline ↓',
	TITLE_ASC: 'Title A–Z',
	AMOUNT_DESC: 'Amount ↓',
} as const;

export function BookmarksPage() {
	const pathname = usePathname();
	const { filters, setFilters, resetFilters, searchParamsString } =
		useBookmarkFilters();
	const [page, setPage] = useState(1);
	const pageSize = 10;
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
	const [notesOpenById, setNotesOpenById] = useState<Record<string, boolean>>(
		{},
	);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
		resetFilters();
	};

	const updateFilters = (next: Partial<typeof filters>) => {
		setFilters((prev) => ({ ...prev, ...next }));
	};

	const {
		search,
		bookmarkStatus,
		grantStatus,
		sort,
		tags: selectedTags,
		tagMatchMode,
		hasNote,
		dueSoon,
		minFitScore,
		needsReview,
	} = filters;

	const filtersInput =
		bookmarkStatus !== 'ALL' ||
		grantStatus !== 'ALL' ||
		search.trim() ||
		selectedTags.length > 0 ||
		hasNote !== 'ALL'
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
						hasNote === 'HAS' ? true : hasNote === 'NONE' ? false : undefined,
				}
			: undefined;

	const listQuery = trpc.bookmark.list.useQuery(
		{ filters: filtersInput, sort },
		{
			refetchOnWindowFocus: false,
		},
	);

	const utils = trpc.useUtils();

	const bookmarks = listQuery.data?.items ?? [];
	const totalBookmarks = bookmarks.length;
	const filteredBookmarks = useMemo(() => {
		let next = bookmarks;
		if (dueSoon) {
			const now = new Date();
			const cutoff = new Date(now);
			cutoff.setDate(now.getDate() + 14);
			next = next.filter((bookmark) => {
				if (!bookmark.grant.deadline) return false;
				const deadline = new Date(bookmark.grant.deadline);
				return deadline >= now && deadline <= cutoff;
			});
		}
		if (minFitScore !== null) {
			next = next.filter((bookmark) => bookmark.grant.fitScore >= minFitScore);
		}
		if (needsReview) {
			next = next.filter((bookmark) => {
				const noteText = (bookmark.note ?? '').trim();
				const noNotes = noteText.length === 0;
				const lowConfidence = bookmark.grant.confidence === 'LOW';
				return noNotes || lowConfidence;
			});
		}
		return next;
	}, [bookmarks, dueSoon, minFitScore, needsReview]);
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

	const bulkUpdate = trpc.bookmark.bulkUpdate.useMutation({
		onSuccess: (data) => {
			if (data.removedCount > 0) {
				toast.success(`Removed ${data.removedCount} bookmark(s).`);
			} else {
				toast.success(`Updated ${data.updatedCount} bookmark(s).`);
			}
			setSelectedIds(new Set());
			utils.bookmark.list.invalidate();
			utils.bookmark.getMyTags.invalidate();
			refetchClosedSummary();
		},
		onError: () => {
			toast.error('Bulk update failed. Please try again.');
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
				hasNote,
				dueSoon,
				minFitScore ?? '',
				needsReview,
			].join('|'),
		[
			search,
			bookmarkStatus,
			grantStatus,
			sort,
			selectedTags,
			tagMatchMode,
			hasNote,
			dueSoon,
			minFitScore,
			needsReview,
		],
	);

	useEffect(() => {
		void filterKey;
		setPage(1);
		setSelectedIds(new Set());
	}, [filterKey]);

	const total = filteredBookmarks.length;
	const totalPages = Math.max(1, Math.ceil(total / pageSize));
	const currentPage = Math.min(page, totalPages);
	const paginated = filteredBookmarks.slice(
		(currentPage - 1) * pageSize,
		currentPage * pageSize,
	);
	const pageIds = useMemo(
		() => paginated.map((bookmark) => bookmark.id),
		[paginated],
	);
	const allSelectedOnPage =
		pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
	const selectedCount = selectedIds.size;

	const tagFacets = useMemo(() => {
		const counts = new Map<string, number>();
		for (const bookmark of filteredBookmarks) {
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
	}, [filteredBookmarks, selectedTags]);

	const primaryFacets = tagFacets.slice(0, 12);
	const overflowFacets = tagFacets.slice(12);

	const filtersEqual = useCallback(
		(left: typeof filters, right: typeof filters) => {
			const tagsEqual =
				left.tags.length === right.tags.length &&
				left.tags.every((tag, index) => tag === right.tags[index]);
			return (
				left.search === right.search &&
				left.bookmarkStatus === right.bookmarkStatus &&
				left.grantStatus === right.grantStatus &&
				left.sort === right.sort &&
				tagsEqual &&
				left.tagMatchMode === right.tagMatchMode &&
				left.hasNote === right.hasNote &&
				left.dueSoon === right.dueSoon &&
				left.minFitScore === right.minFitScore &&
				left.needsReview === right.needsReview
			);
		},
		[],
	);

	const matchedView = useMemo(() => {
		return DEFAULT_SAVED_VIEWS.find((view) => {
			const target = { ...defaultBookmarkFilters, ...view.filters };
			return filtersEqual(filters, target);
		});
	}, [filters, filtersEqual]);

	useEffect(() => {
		if (!selectedViewId) {
			setSelectedViewId(matchedView?.id ?? 'CUSTOM');
			return;
		}
		if (selectedViewId === 'CUSTOM' && matchedView) {
			setSelectedViewId(matchedView.id);
		}
	}, [matchedView, selectedViewId]);

	const activeView = DEFAULT_SAVED_VIEWS.find(
		(view) => view.id === selectedViewId,
	);
	const activeViewFilters = activeView
		? { ...defaultBookmarkFilters, ...activeView.filters }
		: null;
	const isModified = activeViewFilters
		? !filtersEqual(filters, activeViewFilters)
		: false;

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
		if (hasNote === 'HAS') {
			parts.push('Notes: with notes');
		}
		if (hasNote === 'NONE') {
			parts.push('Notes: without notes');
		}
		if (dueSoon) {
			parts.push('Due soon');
		}
		if (minFitScore !== null) {
			parts.push(`High fit: >=${minFitScore}`);
		}
		if (needsReview) {
			parts.push('Needs review');
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
		hasNote,
		dueSoon,
		minFitScore,
		needsReview,
		sort,
	]);

	const handleResetToView = () => {
		if (!activeViewFilters) return;
		setFilters(activeViewFilters);
	};

	const toggleSelected = (id: string) => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const handleSelectAll = () => {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (allSelectedOnPage) {
				for (const id of pageIds) {
					next.delete(id);
				}
				return next;
			}
			for (const id of pageIds) {
				next.add(id);
			}
			return next;
		});
	};

	const selectedIdList = Array.from(selectedIds);

	const handleBulkStatus = (status: BookmarkStatus) => {
		if (selectedIdList.length === 0) return;
		bulkUpdate.mutate({ ids: selectedIdList, setStatus: status });
	};

	const handleBulkAddTag = (tag: string) => {
		if (selectedIdList.length === 0) return;
		bulkUpdate.mutate({ ids: selectedIdList, addTags: [tag] });
	};

	const handleBulkRemove = () => {
		if (selectedIdList.length === 0) return;
		bulkUpdate.mutate({ ids: selectedIdList, remove: true });
	};

	const handleSavedViewChange = (value: string) => {
		const view = DEFAULT_SAVED_VIEWS.find((item) => item.id === value);
		if (!view) {
			setSelectedViewId('CUSTOM');
			return;
		}
		setSelectedViewId(view.id);
		setFilters({ ...defaultBookmarkFilters, ...view.filters });
	};

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-1">
				<h1 className="text-2xl font-semibold tracking-tight">Saved Grants</h1>
				<p className="text-sm text-muted-foreground">
					You have {totalBookmarks} bookmarked grant
					{totalBookmarks === 1 ? '' : 's'}
					{closedSummary?.closedCount
						? ` • ${closedSummary.closedCount} closed`
						: ''}
					.
				</p>
			</div>

			<div className="rounded-md border bg-card p-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div className="space-y-2">
						<div className="text-sm text-muted-foreground">{filterSummary}</div>
						<div className="flex flex-wrap items-center gap-2">
							{activeView && activeView.id !== 'ALL' ? (
								<Badge variant="secondary">View: {activeView.label}</Badge>
							) : null}
							{isModified ? <Badge variant="outline">Modified</Badge> : null}
							{isModified && activeViewFilters ? (
								<Button variant="ghost" size="sm" onClick={handleResetToView}>
									Reset to view
								</Button>
							) : null}
						</div>
					</div>
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
						<div className="flex flex-wrap items-center gap-3">
							<Label
								className="text-sm font-medium text-muted-foreground"
								htmlFor="bookmarks-saved-view"
							>
								Saved view
							</Label>
							<Select
								value={selectedViewId ?? 'CUSTOM'}
								onValueChange={handleSavedViewChange}
							>
								<SelectTrigger
									className="w-[220px]"
									id="bookmarks-saved-view"
									aria-labelledby="bookmarks-saved-view"
								>
									<SelectValue placeholder="Saved view" />
								</SelectTrigger>
								<SelectContent>
									{DEFAULT_SAVED_VIEWS.map((view) => (
										<SelectItem key={view.id} value={view.id}>
											{view.label}
										</SelectItem>
									))}
									<SelectItem value="CUSTOM" disabled>
										Custom
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<BookmarkFilters
							search={search}
							bookmarkStatus={bookmarkStatus}
							grantStatus={grantStatus}
							sort={sort}
							hasNoteFilter={hasNote}
							onSearchChange={(value) => updateFilters({ search: value })}
							onBookmarkStatusChange={(value) =>
								updateFilters({ bookmarkStatus: value })
							}
							onGrantStatusChange={(value) =>
								updateFilters({ grantStatus: value })
							}
							onSortChange={(value) => updateFilters({ sort: value })}
							onHasNoteFilterChange={(value) =>
								updateFilters({ hasNote: value })
							}
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
							onToggleTag={(tag) => {
								setFilters((prev) => ({
									...prev,
									tags: prev.tags.includes(tag)
										? prev.tags.filter((value) => value !== tag)
										: [...prev.tags, tag],
								}));
							}}
							onClearTags={() => {
								setFilters((prev) => ({
									...prev,
									tags: [],
									tagMatchMode: 'ANY',
								}));
							}}
							onTagMatchModeChange={(value) =>
								updateFilters({ tagMatchMode: value })
							}
						/>
					</div>
				)}
			</div>

			<BulkActionBar
				selectedCount={selectedCount}
				allSelected={allSelectedOnPage}
				onSelectAll={handleSelectAll}
				onClearSelection={() => setSelectedIds(new Set())}
				onSetStatus={handleBulkStatus}
				onAddTag={handleBulkAddTag}
				onRemove={handleBulkRemove}
				isPending={bulkUpdate.isPending}
			/>

			{listQuery.isLoading ? (
				<div className="flex justify-center py-12">
					<span className="text-sm text-muted-foreground">Loading...</span>
				</div>
			) : filteredBookmarks.length === 0 ? (
				<p className="text-center py-12 text-muted-foreground">
					No bookmarked grants yet.
				</p>
			) : (
				<div className="space-y-4">
					<div className="grid gap-4 md:grid-cols-2">
						{paginated.map((bookmark) => {
							const hasNote = (bookmark.note ?? '').trim().length > 0;
							const defaultOpen = hasNote;
							const isOpen = notesOpenById[bookmark.id] ?? defaultOpen;
							return (
								<div key={bookmark.id} className="space-y-3">
									<div className="relative">
										<div className="absolute left-3 top-3 z-10">
											<input
												type="checkbox"
												className="h-4 w-4 rounded border-input"
												checked={selectedIds.has(bookmark.id)}
												onChange={() => toggleSelected(bookmark.id)}
												aria-label={`Select ${bookmark.grant.title}`}
											/>
										</div>
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
									</div>
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
