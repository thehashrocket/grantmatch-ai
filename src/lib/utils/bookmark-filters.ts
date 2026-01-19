import type { BookmarkSort, BookmarkStatus } from '@/lib/types/bookmark';

export type BookmarkGrantStatus = 'ALL' | 'OPEN' | 'CLOSED' | 'UNKNOWN';
export type BookmarkTagMatchMode = 'ANY' | 'ALL';
export type BookmarkNoteFilter = 'ALL' | 'HAS' | 'NONE';

export type BookmarkFilterState = {
	search: string;
	bookmarkStatus: BookmarkStatus | 'ALL';
	grantStatus: BookmarkGrantStatus;
	sort: BookmarkSort;
	tags: string[];
	tagMatchMode: BookmarkTagMatchMode;
	hasNote: BookmarkNoteFilter;
	dueSoon: boolean;
	minFitScore: number | null;
	needsReview: boolean;
};

export const defaultBookmarkFilters: BookmarkFilterState = {
	search: '',
	bookmarkStatus: 'ALL',
	grantStatus: 'ALL',
	sort: 'BOOKMARKED_AT_DESC',
	tags: [],
	tagMatchMode: 'ANY',
	hasNote: 'ALL',
	dueSoon: false,
	minFitScore: null,
	needsReview: false,
};

const normalizeTagList = (values: string[]) => {
	const cleaned = values
		.map((value) => value.replace(/\s+/g, ' ').trim().toLowerCase())
		.filter((value) => value.length > 0 && value.length <= 30);
	const unique = Array.from(new Set(cleaned));
	return unique.slice(0, 10);
};

const parseTagsParam = (value: string | null) => {
	if (!value) return [];
	return normalizeTagList(value.split(','));
};

const coerceBookmarkStatus = (
	value: string | null,
): BookmarkFilterState['bookmarkStatus'] => {
	if (value === 'INTERESTED' || value === 'APPLIED' || value === 'NOT_FOR_US') {
		return value;
	}
	return 'ALL';
};

const coerceGrantStatus = (value: string | null): BookmarkGrantStatus => {
	if (value === 'OPEN' || value === 'CLOSED' || value === 'UNKNOWN') {
		return value;
	}
	return 'ALL';
};

const coerceSort = (value: string | null): BookmarkSort => {
	switch (value) {
		case 'BOOKMARKED_AT_DESC':
		case 'DEADLINE_ASC':
		case 'DEADLINE_DESC':
		case 'TITLE_ASC':
		case 'AMOUNT_DESC':
			return value;
		default:
			return 'BOOKMARKED_AT_DESC';
	}
};

const coerceTagMatchMode = (value: string | null): BookmarkTagMatchMode =>
	value === 'ALL' ? 'ALL' : 'ANY';

const coerceNoteFilter = (value: string | null): BookmarkNoteFilter =>
	value === 'HAS' || value === 'NONE' ? value : 'ALL';

const coerceMinFitScore = (value: string | null) => {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isNaN(parsed) ? null : parsed;
};

const coerceFlag = (value: string | null) =>
	value === '1' || value === 'true';

export const parseBookmarkFilters = (
	params: URLSearchParams | null | undefined,
): BookmarkFilterState => {
	if (!params) return { ...defaultBookmarkFilters };
	const tags = parseTagsParam(params.get('b_tags'));
	return {
		search: params.get('b_search') ?? '',
		bookmarkStatus: coerceBookmarkStatus(params.get('b_status')),
		grantStatus: coerceGrantStatus(params.get('b_grant_status')),
		sort: coerceSort(params.get('b_sort')),
		tags,
		tagMatchMode: coerceTagMatchMode(params.get('b_tag_mode')),
		hasNote: coerceNoteFilter(params.get('b_note')),
		dueSoon: coerceFlag(params.get('b_due_soon')),
		minFitScore: coerceMinFitScore(params.get('b_min_fit')),
		needsReview: coerceFlag(params.get('b_needs_review')),
	};
};

export const applyBookmarkFiltersToParams = (
	current: URLSearchParams | null | undefined,
	filters: BookmarkFilterState,
) => {
	const params = new URLSearchParams(current?.toString() ?? '');

	const setOrDelete = (key: string, value: string | null) => {
		if (!value) {
			params.delete(key);
		} else {
			params.set(key, value);
		}
	};

	setOrDelete('b_search', filters.search.trim() || null);
	setOrDelete(
		'b_status',
		filters.bookmarkStatus !== 'ALL' ? filters.bookmarkStatus : null,
	);
	setOrDelete(
		'b_grant_status',
		filters.grantStatus !== 'ALL' ? filters.grantStatus : null,
	);
	setOrDelete(
		'b_sort',
		filters.sort !== defaultBookmarkFilters.sort ? filters.sort : null,
	);
	const tags = normalizeTagList(filters.tags);
	setOrDelete('b_tags', tags.length ? tags.join(',') : null);
	setOrDelete(
		'b_tag_mode',
		tags.length && filters.tagMatchMode !== 'ANY'
			? filters.tagMatchMode
			: null,
	);
	setOrDelete('b_note', filters.hasNote !== 'ALL' ? filters.hasNote : null);
	setOrDelete('b_due_soon', filters.dueSoon ? '1' : null);
	setOrDelete(
		'b_min_fit',
		filters.minFitScore !== null ? String(filters.minFitScore) : null,
	);
	setOrDelete('b_needs_review', filters.needsReview ? '1' : null);

	return params;
};
