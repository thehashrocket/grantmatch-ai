import { describe, expect, it } from 'vitest';
import { normalizeTags } from '@/lib/utils/normalizeTags';

describe('normalizeTags', () => {
	it('normalizes casing, trims, and dedupes', () => {
		const result = normalizeTags(['  Education ', 'education', 'STEM', 'stem']);
		expect(result).toEqual(['education', 'stem']);
	});

	it('enforces length and count limits', () => {
		const longTag = 'x'.repeat(31);
		expect(() => normalizeTags([longTag])).toThrow();

		const tooMany = Array.from({ length: 11 }, (_, i) => `tag-${i}`);
		expect(() => normalizeTags(tooMany)).toThrow();
	});
});
