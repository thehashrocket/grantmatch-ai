import { describe, expect, it } from 'vitest';
import { DEFAULT_SAVED_VIEWS } from '@/lib/bookmarks/saved-views';
import {
	applyBookmarkFiltersToParams,
	defaultBookmarkFilters,
} from '@/lib/utils/bookmark-filters';

describe('saved views', () => {
	it('serializes a saved view into query params', () => {
		const view = DEFAULT_SAVED_VIEWS.find((item) => item.id === 'DUE_SOON');
		expect(view).toBeTruthy();
		const params = applyBookmarkFiltersToParams(new URLSearchParams(), {
			...defaultBookmarkFilters,
			...(view?.filters ?? {}),
		});
		expect(params.get('b_due_soon')).toBe('1');
	});
});
