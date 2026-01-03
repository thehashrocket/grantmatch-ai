'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import {
	BOOKMARK_STATUS_LABELS,
	type BookmarkSort,
	type BookmarkStatus,
} from '@/lib/types/bookmark';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

const sortOptions: { value: BookmarkSort; label: string }[] = [
	{ value: 'BOOKMARKED_AT_DESC', label: 'Bookmarked (newest)' },
	{ value: 'DEADLINE_ASC', label: 'Deadline ↑' },
	{ value: 'DEADLINE_DESC', label: 'Deadline ↓' },
	{ value: 'TITLE_ASC', label: 'Title A–Z' },
	{ value: 'AMOUNT_DESC', label: 'Amount ↓' },
];

export function BookmarkedGrants() {
	const [search, setSearch] = useState('');
	const [bookmarkStatus, setBookmarkStatus] = useState<BookmarkStatus | 'ALL'>(
		'ALL',
	);
	const [grantStatus, setGrantStatus] = useState<
		'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN'
	>('ALL');
	const [sort, setSort] = useState<BookmarkSort>('BOOKMARKED_AT_DESC');
	const [page, setPage] = useState(1);
	const pageSize = 10;
	const searchId = 'bookmarked-grants-search';
	const bookmarkStatusId = 'bookmarked-grants-status';
	const grantStatusId = 'bookmarked-grants-grant-status';
	const sortId = 'bookmarked-grants-sort';
	const tagFilterId = 'bookmarked-grants-tag-filter';
	const tagModeId = 'bookmarked-grants-tag-mode';
	const noteFilterId = 'bookmarked-grants-note-filter';
	const [selectedTags, setSelectedTags] = useState<string[]>([]);
	const [tagMatchMode, setTagMatchMode] = useState<'ANY' | 'ALL'>('ANY');
	const [hasNoteFilter, setHasNoteFilter] = useState<'ALL' | 'HAS' | 'NONE'>(
		'ALL',
	);

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
	const { data: tagSummary } = trpc.bookmark.getMyTags.useQuery();

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

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
				<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
					<div className="flex flex-col gap-2">
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={searchId}
						>
							Search
						</label>
						<Input
							id={searchId}
							placeholder="Search bookmarked grants"
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							className="w-full md:w-[240px]"
						/>
					</div>

					<div className="flex flex-col gap-2">
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={bookmarkStatusId}
						>
							Bookmark status
						</label>
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
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={grantStatusId}
						>
							Grant status
						</label>
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
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={sortId}
						>
							Sort
						</label>
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
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={noteFilterId}
						>
							Notes
						</label>
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
					onClick={() => removeClosed.mutate()}
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
					<label
						className="text-sm font-medium text-muted-foreground"
						htmlFor={tagFilterId}
					>
						Tags
					</label>
					<div className="flex flex-wrap gap-2">
						{tagSummary?.length ? (
							tagSummary.map((tag) => {
								const isActive = selectedTags.includes(tag.tag);
								return (
									<Button
										key={tag.tag}
										variant={isActive ? 'secondary' : 'outline'}
										size="sm"
										onClick={() => {
											setSelectedTags((prev) =>
												prev.includes(tag.tag)
													? prev.filter((t) => t !== tag.tag)
													: [...prev, tag.tag],
											);
										}}
									>
										{tag.tag}
										<Badge variant="secondary" className="ml-2">
											{tag.count}
										</Badge>
									</Button>
								);
							})
						) : (
							<span className="text-sm text-muted-foreground">
								No tags yet. Add some from bookmark notes.
							</span>
						)}
					</div>
				</div>
				{selectedTags.length > 0 && (
					<div className="flex flex-wrap items-center gap-3">
						<label
							className="text-sm font-medium text-muted-foreground"
							htmlFor={tagModeId}
						>
							Tag match
						</label>
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
