import { describe, expect, it } from 'vitest';
import { applyReturnTo, buildReturnTo, resolveBackTarget } from './return-to';

describe('return-to helpers', () => {
	it('builds returnTo from pathname and search', () => {
		const result = buildReturnTo(
			'/dashboard',
			'textSearch=housing&source=CALIFORNIA',
		);
		expect(result).toBe('/dashboard?textSearch=housing&source=CALIFORNIA');
	});

	it('applies returnTo to internal URLs', () => {
		const href = applyReturnTo('/grants/123', '/dashboard?textSearch=housing');
		expect(href).toContain('returnTo=');
		expect(href).toContain(encodeURIComponent('/dashboard?textSearch=housing'));
	});

	it('resolves back target with fallback', () => {
		expect(resolveBackTarget('%2Fdashboard%3FtextSearch%3Dhousing')).toBe(
			'/dashboard?textSearch=housing',
		);
		expect(resolveBackTarget(null)).toBe('/bookmarks');
	});
});
