import type { BookmarkFilters } from '@/lib/types/bookmark';

export type SavedView = {
	id: string;
	label: string;
	filters: Partial<BookmarkFilters>;
};

export const DEFAULT_SAVED_VIEWS: SavedView[] = [
	{
		id: 'ALL',
		label: 'All bookmarked',
		filters: {},
	},
	{
		id: 'INTERESTED',
		label: 'Interested',
		filters: { bookmarkStatus: 'INTERESTED' },
	},
	{
		id: 'APPLIED',
		label: 'Applied',
		filters: { bookmarkStatus: 'APPLIED' },
	},
	{
		id: 'DUE_SOON',
		label: 'Due soon',
		filters: { dueSoon: true },
	},
	{
		id: 'HIGH_FIT',
		label: 'High fit',
		filters: { minFitScore: 7.5 },
	},
	{
		id: 'NEEDS_REVIEW',
		label: 'Needs review',
		filters: { needsReview: true },
	},
];
