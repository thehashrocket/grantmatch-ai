import { describe, expect, it } from 'vitest';
import { computeOrgGrantFitScore } from './org-grant-scoring';

const baseOrg = {
	focusKeywords: ['housing', 'youth services'],
	geographyKeywords: ['california', 'bay area'],
	applicantType: 'NONPROFIT' as const,
	minAward: 10000,
	maxAward: 50000,
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
	it('boosts eligibility for matching applicant type', () => {
		const { subscores } = computeOrgGrantFitScore(baseOrg, baseGrant);
		expect(subscores.eligibility).toBeGreaterThanOrEqual(0.9);
	});

	it('increases purpose subscore when focus keywords overlap', () => {
		const withOverlap = computeOrgGrantFitScore(baseOrg, baseGrant);
		const withoutOverlap = computeOrgGrantFitScore(
			{ ...baseOrg, focusKeywords: ['agriculture'] },
			baseGrant,
		);
		expect(withOverlap.subscores.purpose).toBeGreaterThan(
			withoutOverlap.subscores.purpose,
		);
	});

	it('boosts geography when geographyKeywords match', () => {
		const withGeo = computeOrgGrantFitScore(baseOrg, baseGrant);
		const withoutGeo = computeOrgGrantFitScore(
			{ ...baseOrg, geographyKeywords: ['new york'] },
			baseGrant,
		);
		expect(withGeo.subscores.geography).toBeGreaterThan(
			withoutGeo.subscores.geography,
		);
	});

	it('favors funding within the org range', () => {
		const inRange = computeOrgGrantFitScore(baseOrg, baseGrant);
		const outOfRange = computeOrgGrantFitScore(
			{ ...baseOrg },
			{ ...baseGrant, estimatedTotalFunding: 500000 },
		);
		expect(inRange.subscores.funding).toBeGreaterThan(
			outOfRange.subscores.funding,
		);
	});
});
