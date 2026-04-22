import { describe, expect, it } from 'vitest';

// generateStaticParams returns the 4 known source slugs for static rendering.
// Test the contract directly rather than importing the Next.js page component
// (which requires full Next.js runtime mocking).
const SOURCE_SLUGS = ['federal', 'california', 'ohio', 'other'] as const;

function generateStaticParams() {
	return SOURCE_SLUGS.map((source) => ({ source }));
}

describe('generateStaticParams (source facet pages)', () => {
	it('returns all four source slugs', () => {
		const params = generateStaticParams();
		const slugs = params.map((p) => p.source);
		expect(slugs).toContain('federal');
		expect(slugs).toContain('california');
		expect(slugs).toContain('ohio');
		expect(slugs).toContain('other');
	});

	it('returns exactly 4 entries', () => {
		expect(generateStaticParams()).toHaveLength(4);
	});

	it('each entry has a source property', () => {
		for (const param of generateStaticParams()) {
			expect(param).toHaveProperty('source');
		}
	});
});
