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
	search: string;
	bookmarkStatus: BookmarkStatus | 'ALL';
	grantStatus: 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
	sort: BookmarkSort;
	tags: string[];
	tagMatchMode: 'ANY' | 'ALL';
	hasNote: 'ALL' | 'HAS' | 'NONE';
	dueSoon: boolean;
	minFitScore: number | null;
	needsReview: boolean;
};

export interface BookmarkStatusRecord {
	isBookmarked: true;
	status: BookmarkStatus;
	tags?: string[];
}
