import { describe, expect, it } from 'vitest';
import {
	applyBookmarkFiltersToParams,
	defaultBookmarkFilters,
	parseBookmarkFilters,
} from '@/lib/utils/bookmark-filters';

describe('bookmark filter url helpers', () => {
	it('parses query params into filter state', () => {
		const params = new URLSearchParams(
			'b_search=health&b_status=APPLIED&b_grant_status=OPEN&b_sort=TITLE_ASC&b_tags=needs%20follow-up,local%20programs&b_tag_mode=ALL&b_note=HAS&b_due_soon=1&b_min_fit=7.5&b_needs_review=1',
		);
		const parsed = parseBookmarkFilters(params);
		expect(parsed.search).toBe('health');
		expect(parsed.bookmarkStatus).toBe('APPLIED');
		expect(parsed.grantStatus).toBe('OPEN');
		expect(parsed.sort).toBe('TITLE_ASC');
		expect(parsed.tags).toEqual(['needs follow-up', 'local programs']);
		expect(parsed.tagMatchMode).toBe('ALL');
		expect(parsed.hasNote).toBe('HAS');
		expect(parsed.dueSoon).toBe(true);
		expect(parsed.minFitScore).toBe(7.5);
		expect(parsed.needsReview).toBe(true);
	});

	it('serializes non-default filters into query params', () => {
		const next = applyBookmarkFiltersToParams(new URLSearchParams(), {
			...defaultBookmarkFilters,
			search: 'community',
			bookmarkStatus: 'INTERESTED',
			tags: ['local programs', 'community'],
			dueSoon: true,
			minFitScore: 7.5,
		});
		expect(next.get('b_search')).toBe('community');
		expect(next.get('b_status')).toBe('INTERESTED');
		expect(next.get('b_tags')).toBe('local programs,community');
		expect(next.get('b_due_soon')).toBe('1');
		expect(next.get('b_min_fit')).toBe('7.5');
		expect(next.get('b_sort')).toBeNull();
	});
});
