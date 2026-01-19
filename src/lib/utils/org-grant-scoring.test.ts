import { describe, expect, it } from 'vitest';
import { computeOrgGrantFitScore } from './org-grant-scoring';

const baseOrg = {
	focusAreas: ['housing', 'youth services'],
	priorityFocusKeywords: [],
	serviceAreas: ['california', 'bay area'],
	entityType: 'NONPROFIT_501C3' as const,
	budgetRange: 'FROM_50K_TO_250K' as const,
	minAward: null,
	maxAward: null,
};

const baseGrant = {
	eligibleApplicants: 'Nonprofit organizations',
	eligibleGeographies: 'State of California',
	purpose: 'This program supports housing initiatives for youth.',
	estimatedTotalFunding: 25000,
	awardFloor: null,
	awardCeiling: null,
};

describe('computeOrgGrantFitScore', () => {
	it('boosts eligibility when entity type matches nonprofit 501(c)(3)', () => {
		const { subscores } = computeOrgGrantFitScore(baseOrg, baseGrant);
		const { subscores: nonProfitOther } = computeOrgGrantFitScore(
			{ ...baseOrg, entityType: 'FOR_PROFIT' },
			baseGrant,
		);
		expect(subscores.eligibility).toBeGreaterThan(nonProfitOther.eligibility);
	});

	it('flags missing funding and computes confidence', () => {
		const result = computeOrgGrantFitScore(baseOrg, {
			...baseGrant,
			estimatedTotalFunding: null,
			awardCeiling: null,
			awardFloor: null,
		});

		expect(result.missing.fundingAmount).toBe(true);
		expect(result.confidence).toBe('MED');
		expect(
			result.reasons.some(
				(reason) =>
					(reason.label === 'Funding not listed' ||
						reason.label === 'Funding amount not listed') &&
					(reason.strength === 'neutral' || reason.strength === 'medium'),
			),
		).toBe(true);

		const withMoreMissing = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: [] },
			{
				...baseGrant,
				eligibleGeographies: null,
				estimatedTotalFunding: null,
				awardCeiling: null,
				awardFloor: null,
			},
		);
		expect(withMoreMissing.missing.eligibleGeographies).toBe(true);
		expect(withMoreMissing.confidence).toBe('LOW');
	});

	it('includes a priority focus reason with detail when keyword hits', () => {
		const result = computeOrgGrantFitScore(
			{
				...baseOrg,
				priorityFocusKeywords: ['affordable housing'],
			},
			{
				...baseGrant,
				purpose: 'New affordable housing program',
			},
		);

		const priorityReason = result.reasons.find(
			(reason) => reason.label === 'Priority focus match',
		);

		expect(priorityReason?.detail?.toLowerCase()).toContain(
			'affordable housing',
		);
		expect(result.explanation).toContain('priorities');
	});

	it('returns deterministic, capped reasons', () => {
		const first = computeOrgGrantFitScore(baseOrg, baseGrant);
		const second = computeOrgGrantFitScore(baseOrg, baseGrant);

		expect(first.reasons.length).toBeLessThanOrEqual(4);
		expect(second.reasons.length).toBeLessThanOrEqual(4);
		expect(first.reasons).toEqual(second.reasons);
	});

	it('treats budget range as preferred range for funding chips', () => {
		const result = computeOrgGrantFitScore(
			{ ...baseOrg, budgetRange: 'FROM_50K_TO_250K' },
			baseGrant,
		);

		expect(
			result.reasons.some(
				(reason) => reason.label === 'Funding fits your budget range',
			),
		).toBe(true);
		expect(result.matches.amountInRange).toBe(true);
	});
});
