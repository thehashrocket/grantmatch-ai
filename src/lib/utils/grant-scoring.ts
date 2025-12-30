// import { type Prisma } from '@prisma/client';

interface ScoringFactors {
	deadlineWeight: number;
	fundingWeight: number;
	eligibilityWeight: number;
	geographyWeight: number;
	purposeWeight: number;
}

const DEFAULT_SCORING_FACTORS: ScoringFactors = {
	deadlineWeight: 0.2,
	fundingWeight: 0.3,
	eligibilityWeight: 0.2,
	geographyWeight: 0.1,
	purposeWeight: 0.2,
};

function calculateDeadlineScore(deadline: Date | null): number {
	if (!deadline) return 0.5; // Neutral score for unknown deadlines

	const now = new Date();
	const daysUntilDeadline = Math.floor(
		(deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
	);

	// Score higher for deadlines between 30-90 days away
	if (daysUntilDeadline < 0) return 0; // Past deadline
	if (daysUntilDeadline <= 14) return 0.6; // Urgent but might be too soon
	if (daysUntilDeadline <= 30) return 0.8; // Good amount of time
	if (daysUntilDeadline <= 90) return 1.0; // Ideal timeframe
	if (daysUntilDeadline <= 180) return 0.7; // Still good but far out
	return 0.5; // Very far in the future
}

function calculateFundingScore(amount: number | bigint | null): number {
	if (amount === null) return 0.5; // Unknown amount

	// Convert to number if it's a bigint
	const fundingAmount = typeof amount === 'bigint' ? Number(amount) : amount;
	if (fundingAmount <= 0) return 0.5; // Unknown amount

	// Score based on funding tiers
	if (fundingAmount < 10000) return 0.6;
	if (fundingAmount < 50000) return 0.7;
	if (fundingAmount < 100000) return 0.8;
	if (fundingAmount < 500000) return 1.0;
	if (fundingAmount < 1000000) return 0.9;
	return 0.7; // Very large grants might be more competitive
}

function calculateEligibilityScore(eligibleApplicants: string | null): number {
	if (!eligibleApplicants) return 0.5; // Default score for null/empty values

	const applicants = eligibleApplicants.toLowerCase();

	// Higher score for nonprofit-specific grants
	if (applicants.includes('nonprofit') || applicants.includes('non-profit')) {
		return 1.0;
	}

	// Medium score for mixed eligibility
	if (applicants.includes('organization') || applicants.includes('entity')) {
		return 0.7;
	}

	return 0.5; // Default score for other types
}

function calculateGeographyScore(eligibleGeographies: string | null): number {
	if (!eligibleGeographies) return 0.6; // Default score for null/empty values

	const geography = eligibleGeographies.toLowerCase();

	// Prefer grants with broader geographic eligibility
	if (geography.includes('nationwide') || geography.includes('national')) {
		return 1.0;
	}
	if (geography.includes('state') || geography.includes('california')) {
		return 0.9;
	}
	if (geography.includes('county') || geography.includes('local')) {
		return 0.8;
	}

	return 0.6; // Default score for other geographic restrictions
}

function calculatePurposeScore(purpose: string | null): number {
	// This is a placeholder - in a real implementation, you would:
	// 1. Compare against organization's mission and focus areas
	// 2. Use NLP to calculate semantic similarity
	// 3. Check for keyword matches in priority areas
	if (!purpose) return 0.5; // Default score for null/empty values
	return 0.8;
}

type GrantWithRequiredFields = {
	deadline: Date | null;
	estimatedTotalFunding: bigint | number | null;
	eligibleApplicants: string | null;
	eligibleGeographies: string | null;
	purpose: string | null;
};

export function calculateGrantFitScore(
	grant: GrantWithRequiredFields,
	factors: ScoringFactors = DEFAULT_SCORING_FACTORS,
): number {
	const scores = {
		deadline: calculateDeadlineScore(grant.deadline) * factors.deadlineWeight,
		funding:
			calculateFundingScore(grant.estimatedTotalFunding || 0) *
			factors.fundingWeight,
		eligibility:
			calculateEligibilityScore(grant.eligibleApplicants) *
			factors.eligibilityWeight,
		geography:
			calculateGeographyScore(grant.eligibleGeographies) *
			factors.geographyWeight,
		purpose: calculatePurposeScore(grant.purpose) * factors.purposeWeight,
	};

	// Calculate weighted average and scale to 0-10
	const totalScore = Object.values(scores).reduce(
		(sum, score) => sum + score,
		0,
	);
	const maxPossibleScore = Object.values(factors).reduce(
		(sum, weight) => sum + weight,
		0,
	);

	return (totalScore / maxPossibleScore) * 10;
}
