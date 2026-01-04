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

	it('detects 501(c)(3) when formatted with spaces or parentheses', () => {
		const messyGrant = {
			...baseGrant,
			eligibleApplicants: 'Eligible applicants include 501 c 3 organizations.',
		};
		const { subscores } = computeOrgGrantFitScore(baseOrg, messyGrant);
		expect(subscores.eligibility).toBeGreaterThan(0.9);
	});

	it('increases purpose subscore when focus areas overlap', () => {
		const withOverlap = computeOrgGrantFitScore(baseOrg, baseGrant);
		const withoutOverlap = computeOrgGrantFitScore(
			{ ...baseOrg, focusAreas: ['agriculture'] },
			baseGrant,
		);
		expect(withOverlap.subscores.purpose).toBeGreaterThan(
			withoutOverlap.subscores.purpose,
		);
	});

	it('boosts priority focus keywords heavier than regular focus areas', () => {
		const priorityOrg = {
			...baseOrg,
			priorityFocusKeywords: ['housing', 'homelessness'],
			focusAreas: ['arts', 'music'],
		};
		const result = computeOrgGrantFitScore(priorityOrg, {
			...baseGrant,
			purpose: 'Housing stability and homelessness prevention programs',
		});
		expect(result.subscores.purpose).toBeGreaterThanOrEqual(0.85);
		expect(result.explanation.toLowerCase()).toContain('priority focus');
	});

	it('scores lower when only non-priority focus areas match', () => {
		const priorityOrg = {
			...baseOrg,
			priorityFocusKeywords: ['housing', 'homelessness'],
			focusAreas: ['arts', 'music'],
		};
		const nonPriorityOrg = {
			...baseOrg,
			priorityFocusKeywords: [],
			focusAreas: ['housing', 'homelessness'],
		};

		const grant = {
			...baseGrant,
			purpose: 'Housing stability and homelessness prevention programs',
		};

		const priorityScore = computeOrgGrantFitScore(priorityOrg, grant);
		const nonPriorityScore = computeOrgGrantFitScore(nonPriorityOrg, grant);

		expect(priorityScore.subscores.purpose).toBeGreaterThan(
			nonPriorityScore.subscores.purpose,
		);
	});

	it('keeps purpose strong when overlap exists even with extra keywords', () => {
		const extendedOrg = {
			...baseOrg,
			focusAreas: ['housing', 'youth services', 'community', 'development'],
		};
		const { subscores } = computeOrgGrantFitScore(extendedOrg, baseGrant);
		expect(subscores.purpose).toBeGreaterThan(0.3);
	});

	it('boosts geography when service areas match and caps national scope', () => {
		const withGeo = computeOrgGrantFitScore(baseOrg, baseGrant);
		const nationwide = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: ['anywhere'] },
			{ ...baseGrant, eligibleGeographies: 'National program' },
		);
		expect(nationwide.subscores.geography).toBeCloseTo(0.9);
		expect(withGeo.subscores.geography).toBeGreaterThan(
			nationwide.subscores.geography - 0.05,
		);
	});

	it('penalizes local mismatch geography', () => {
		const mismatch = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: ['san francisco'] },
			{ ...baseGrant, eligibleGeographies: 'Los Angeles county only' },
		);
		const overlap = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: ['los angeles'] },
			{ ...baseGrant, eligibleGeographies: 'Los Angeles county only' },
		);
		expect(mismatch.fitScore).toBeLessThan(overlap.fitScore);
	});

	it('favors funding within the org budget range', () => {
		const inRange = computeOrgGrantFitScore(
			{ ...baseOrg, budgetRange: 'FROM_50K_TO_250K' },
			baseGrant,
		);
		const outOfRange = computeOrgGrantFitScore(
			{ ...baseOrg, budgetRange: 'LT_50K' },
			{ ...baseGrant, estimatedTotalFunding: 500000 },
		);
		expect(inRange.subscores.funding).toBeGreaterThan(
			outOfRange.subscores.funding,
		);
	});

	it('makes purpose the dominant driver of fit', () => {
		const purposePerfect = computeOrgGrantFitScore(
			{
				...baseOrg,
				serviceAreas: [],
				priorityFocusKeywords: ['housing', 'youth', 'services'],
				focusAreas: [],
			},
			{
				...baseGrant,
				eligibleApplicants: null,
				eligibleGeographies: null,
				purpose: 'housing youth services',
				estimatedTotalFunding: null,
			},
		);
		expect(purposePerfect.fitScore).toBeGreaterThanOrEqual(8);
	});

	it('applies soft gate when eligibility is weak', () => {
		const strongEligibility = computeOrgGrantFitScore(baseOrg, baseGrant);
		const weakEligibility = computeOrgGrantFitScore(
			{ ...baseOrg, entityType: 'FOR_PROFIT' },
			{ ...baseGrant, eligibleApplicants: 'Nonprofit organizations only' },
		);
		expect(weakEligibility.fitScore).toBeLessThan(strongEligibility.fitScore);
	});

	it('reduces score for local geography mismatch', () => {
		const mismatch = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: ['san francisco'] },
			{ ...baseGrant, eligibleGeographies: 'Local city programs only' },
		);
		const generic = computeOrgGrantFitScore(
			{ ...baseOrg, serviceAreas: ['san francisco'] },
			{ ...baseGrant, eligibleGeographies: 'Statewide programs' },
		);
		expect(mismatch.fitScore).toBeLessThan(generic.fitScore);
	});
});
