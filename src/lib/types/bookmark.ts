// /src/lib/types/bookmark.ts

export type BookmarkStatus = 'INTERESTED' | 'APPLIED' | 'NOT_FOR_US';

export const BOOKMARK_STATUS_LABELS: Record<BookmarkStatus, string> = {
	INTERESTED: 'Interested',
	APPLIED: 'Applied',
	NOT_FOR_US: 'Not for us',
};

export type BookmarkSort =
	| 'BOOKMARKED_AT_DESC'
	| 'DEADLINE_ASC'
	| 'DEADLINE_DESC'
	| 'TITLE_ASC'
	| 'AMOUNT_DESC';

export type BookmarkFilters = {
	bookmarkStatus?: BookmarkStatus[];
	grantStatus?: ('OPEN' | 'CLOSED' | 'UNKNOWN')[];
	search?: string;
};

export interface BookmarkStatusRecord {
	isBookmarked: true;
	status: BookmarkStatus;
	tags?: string[];
}
