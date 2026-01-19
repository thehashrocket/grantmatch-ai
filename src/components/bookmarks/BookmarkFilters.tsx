// /src/components/bookmarks/BookmarkFilters.tsx

'use client';

import { Loader2 } from 'lucide-react';
import type { BookmarkSort, BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
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

const sortOptions: { value: BookmarkSort; label: string }[] = [
	{ value: 'BOOKMARKED_AT_DESC', label: 'Bookmarked (newest)' },
	{ value: 'DEADLINE_ASC', label: 'Deadline ↑' },
	{ value: 'DEADLINE_DESC', label: 'Deadline ↓' },
	{ value: 'TITLE_ASC', label: 'Title A–Z' },
	{ value: 'AMOUNT_DESC', label: 'Amount ↓' },
];

interface BookmarkFiltersProps {
	search: string;
	bookmarkStatus: BookmarkStatus | 'ALL';
	grantStatus: 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
	sort: BookmarkSort;
	hasNoteFilter: 'ALL' | 'HAS' | 'NONE';
	onSearchChange: (value: string) => void;
	onBookmarkStatusChange: (value: BookmarkStatus | 'ALL') => void;
	onGrantStatusChange: (value: 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN') => void;
	onSortChange: (value: BookmarkSort) => void;
	onHasNoteFilterChange: (value: 'ALL' | 'HAS' | 'NONE') => void;
	onRemoveClosed: () => void;
	removeClosedCount: number;
	removeClosedPending: boolean;
	isClosedSummaryLoading: boolean;
}

export function BookmarkFilters({
	search,
	bookmarkStatus,
	grantStatus,
	sort,
	hasNoteFilter,
	onSearchChange,
	onBookmarkStatusChange,
	onGrantStatusChange,
	onSortChange,
	onHasNoteFilterChange,
	onRemoveClosed,
	removeClosedCount,
	removeClosedPending,
	isClosedSummaryLoading,
}: BookmarkFiltersProps) {
	const searchId = 'bookmarked-grants-search';
	const bookmarkStatusId = 'bookmarked-grants-status';
	const grantStatusId = 'bookmarked-grants-grant-status';
	const sortId = 'bookmarked-grants-sort';
	const noteFilterId = 'bookmarked-grants-note-filter';

	return (
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
						onChange={(event) => onSearchChange(event.target.value)}
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
							onBookmarkStatusChange(value as BookmarkStatus | 'ALL')
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
							onGrantStatusChange(
								value as 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN',
							)
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
						onValueChange={(value) => onSortChange(value as BookmarkSort)}
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
							onHasNoteFilterChange(value as 'ALL' | 'HAS' | 'NONE')
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
					removeClosedPending || isClosedSummaryLoading || !removeClosedCount
				}
				onClick={onRemoveClosed}
			>
				{removeClosedPending ? (
					<>
						<Loader2 className="animate-spin" />
						Removing...
					</>
				) : (
					<>Remove closed grants ({removeClosedCount.toString()})</>
				)}
			</Button>
		</div>
	);
}
