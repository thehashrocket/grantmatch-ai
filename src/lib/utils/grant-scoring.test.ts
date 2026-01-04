import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	calculateDaysUntilDeadline,
	calculateGrantFitScore,
	calculateGrantUrgencyScore,
} from './grant-scoring';

describe('calculateGrantFitScore', () => {
	it('returns the same score when only deadline changes', () => {
		const baseGrant = {
			estimatedTotalFunding: 150000,
			eligibleApplicants: 'Nonprofit organizations',
			eligibleGeographies: 'California',
			purpose: 'Community development',
		};

		const withSoonDeadline = {
			...baseGrant,
			deadline: new Date('2025-01-15T00:00:00Z'),
		} as typeof baseGrant & { deadline: Date };
		const withLaterDeadline = {
			...baseGrant,
			deadline: new Date('2025-06-01T00:00:00Z'),
		} as typeof baseGrant & { deadline: Date };

		const scoreWithSoonDeadline = calculateGrantFitScore(withSoonDeadline);
		const scoreWithLaterDeadline = calculateGrantFitScore(withLaterDeadline);

		expect(scoreWithSoonDeadline).toBeCloseTo(scoreWithLaterDeadline, 5);
	});
});

describe('deadline helpers', () => {
	const now = new Date('2025-01-01T00:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(now);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('scores nearer deadlines as more urgent', () => {
		const soonDeadline = new Date('2025-01-05T00:00:00Z');
		const farDeadline = new Date('2025-12-01T00:00:00Z');

		expect(calculateGrantUrgencyScore(soonDeadline)).toBeGreaterThan(
			calculateGrantUrgencyScore(farDeadline),
		);
	});

	it('returns null for missing deadlines when computing days', () => {
		expect(calculateDaysUntilDeadline(null)).toBeNull();
	});
});
