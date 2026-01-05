import { describe, expect, it } from 'vitest';
import { deriveScorePresentation } from './score-presentation';

describe('deriveScorePresentation', () => {
	it('includes a missing or unknown clause for medium scores', () => {
		const result = deriveScorePresentation({
			grant: {
				fitScore: 5.6,
				purpose: null,
				eligibleApplicants: null,
				eligibleGeographies: null,
				estimatedTotalFunding: 250000,
				awardFloor: null,
				awardCeiling: null,
				fundingAmount: 250000,
				deadline: null,
			},
			subscores: null,
		});

		expect(result.scoreSummary.toLowerCase()).toContain('but');
		expect(result.scoreSummary.toLowerCase()).toMatch(/not listed|unverified/);
	});

	it('adds a funding not listed reason when funding is missing', () => {
		const result = deriveScorePresentation({
			grant: {
				fitScore: 6.2,
				purpose: 'Community development',
				eligibleApplicants: 'Nonprofit',
				eligibleGeographies: 'California',
				estimatedTotalFunding: null,
				awardFloor: null,
				awardCeiling: null,
				fundingAmount: null,
				deadline: null,
			},
			subscores: null,
		});

		expect(result.scoreReasons.unknown).toContain('Funding not listed');
	});

	it('lowers confidence when purpose or eligibility are missing', () => {
		const result = deriveScorePresentation({
			grant: {
				fitScore: 8.4,
				purpose: null,
				eligibleApplicants: null,
				eligibleGeographies: 'California',
				estimatedTotalFunding: 500000,
				awardFloor: null,
				awardCeiling: null,
				fundingAmount: 500000,
				deadline: new Date(),
			},
			subscores: null,
		});

		expect(result.confidence).toBe('LOW');
	});
});
