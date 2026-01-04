// src/lib/utils/org-grant-scoring.ts

export const SCORING_VERSION = 1;

type ApplicantType =
	| 'NONPROFIT'
	| 'SCHOOL'
	| 'GOVERNMENT'
	| 'TRIBE'
	| 'FOR_PROFIT'
	| 'INDIVIDUAL'
	| 'OTHER';

type OrganizationProfile = {
	focusKeywords: string[];
	geographyKeywords: string[];
	applicantType: ApplicantType | null;
	minAward: number | null;
	maxAward: number | null;
};

type GrantForScoring = {
	eligibleApplicants: string | null;
	eligibleGeographies: string | null;
	purpose: string | null;
	estimatedTotalFunding?: number | bigint | null;
	awardFloor?: number | bigint | null;
	awardCeiling?: number | bigint | null;
};

type Subscores = {
	eligibility: number;
	geography: number;
	purpose: number;
	funding: number;
};

const WEIGHTS = {
	eligibility: 0.3,
	purpose: 0.3,
	funding: 0.2,
	geography: 0.2,
};

const applicantKeywordMap: Record<ApplicantType, string[]> = {
	NONPROFIT: ['nonprofit', 'non-profit', '501c3', '501(c)(3)'],
	SCHOOL: ['school', 'education', 'k-12', 'university', 'college'],
	GOVERNMENT: ['government', 'public agency', 'city', 'county', 'state'],
	TRIBE: ['tribe', 'tribal', 'indigenous', 'native'],
	FOR_PROFIT: ['for-profit', 'business', 'company', 'corporation'],
	INDIVIDUAL: ['individual', 'resident', 'person'],
	OTHER: [],
};

const mixedEligibilityKeywords = [
	'organization',
	'entity',
	'multiple',
	'various',
];

function normalizeText(value: string | null | undefined): string {
	return value ? value.toLowerCase().replace(/\s+/g, ' ').trim() : '';
}

function tokenize(value: string): string[] {
	return normalizeText(value)
		.split(/[^a-z0-9]+/g)
		.filter(Boolean);
}

function dedupe(tokens: string[]): string[] {
	return Array.from(new Set(tokens));
}

function toNumber(value: number | bigint | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	return typeof value === 'bigint' ? Number(value) : value;
}

function calculateEligibilityScore(
	applicantType: ApplicantType | null,
	eligibleApplicants: string | null,
): number {
	const normalized = normalizeText(eligibleApplicants);
	if (!normalized) return 0.5;

	const keywords = applicantType
		? (applicantKeywordMap[applicantType] ?? [])
		: [];
	const matchesApplicantType = keywords.some((keyword) =>
		normalized.includes(keyword),
	);
	if (matchesApplicantType) return 1;

	if (
		mixedEligibilityKeywords.some((keyword) => normalized.includes(keyword))
	) {
		return 0.7;
	}

	const matchesOtherType = Object.entries(applicantKeywordMap)
		.filter(([type]) => type !== applicantType)
		.some(([, otherKeywords]) =>
			otherKeywords.some((keyword) => normalized.includes(keyword)),
		);

	return matchesOtherType ? 0.4 : 0.5;
}

function calculateGeographyScore(
	geographyKeywords: string[],
	eligibleGeographies: string | null,
): number {
	const normalized = normalizeText(eligibleGeographies);
	if (!normalized) return 0.6;

	const hasNationalScope =
		normalized.includes('nationwide') || normalized.includes('national');
	if (hasNationalScope) return 1;

	const keywordOverlap = geographyKeywords.some((keyword) =>
		normalized.includes(normalizeText(keyword)),
	);

	let baseScore = 0.6;
	if (normalized.includes('state')) {
		baseScore = 0.85;
	} else if (
		normalized.includes('county') ||
		normalized.includes('local') ||
		normalized.includes('city')
	) {
		baseScore = 0.7;
	}

	if (keywordOverlap) {
		return Math.min(1, Math.max(baseScore + 0.15, 0.9));
	}

	return baseScore;
}

function calculatePurposeScore(
	focusKeywords: string[],
	purpose: string | null,
): { score: number; overlap: string[] } {
	const orgTokens = dedupe(
		focusKeywords.flatMap((keyword) => tokenize(keyword)),
	);
	const purposeTokens = dedupe(tokenize(purpose ?? ''));

	if (orgTokens.length === 0 || purposeTokens.length === 0) {
		return { score: 0.5, overlap: [] };
	}

	const purposeSet = new Set(purposeTokens);
	const overlap = orgTokens.filter((token) => purposeSet.has(token));
	const overlapRatio = overlap.length / orgTokens.length;

	return { score: Math.min(1, overlapRatio), overlap };
}

function calculateFundingScore(
	minAward: number | null,
	maxAward: number | null,
	grantAmount: number | null,
): { score: number; inRange: boolean } {
	if (grantAmount === null || (minAward === null && maxAward === null)) {
		return { score: 0.5, inRange: false };
	}

	if (minAward !== null && maxAward !== null) {
		const inRange = grantAmount >= minAward && grantAmount <= maxAward;
		return { score: inRange ? 0.9 : 0.5, inRange };
	}

	if (minAward !== null) {
		const inRange = grantAmount >= minAward;
		return { score: inRange ? 0.8 : 0.45, inRange };
	}

	const inRange = grantAmount <= (maxAward as number);
	return { score: inRange ? 0.8 : 0.45, inRange };
}

function selectGrantAmount(grant: GrantForScoring): number | null {
	const candidates = [
		grant.estimatedTotalFunding,
		grant.awardCeiling,
		grant.awardFloor,
	];
	for (const candidate of candidates) {
		const value = toNumber(candidate ?? null);
		if (value !== null) return value;
	}
	return null;
}

function formatApplicantType(type: ApplicantType | null): string {
	if (!type) return 'organization';
	return type
		.toLowerCase()
		.replace(/_/g, ' ')
		.replace(/(^|\s)(\w)/g, (match) => match.toUpperCase());
}

export function computeOrgGrantFitScore(
	org: OrganizationProfile,
	grant: GrantForScoring,
): {
	fitScore: number;
	subscores: Subscores;
	explanation: string;
} {
	const eligibility = calculateEligibilityScore(
		org.applicantType,
		grant.eligibleApplicants,
	);
	const geography = calculateGeographyScore(
		org.geographyKeywords,
		grant.eligibleGeographies,
	);
	const { score: purpose, overlap } = calculatePurposeScore(
		org.focusKeywords,
		grant.purpose,
	);
	const amount = selectGrantAmount(grant);
	const { score: funding } = calculateFundingScore(
		org.minAward,
		org.maxAward,
		amount,
	);

	const weighted =
		eligibility * WEIGHTS.eligibility +
		purpose * WEIGHTS.purpose +
		funding * WEIGHTS.funding +
		geography * WEIGHTS.geography;

	const subscores: Subscores = { eligibility, geography, purpose, funding };
	const fitScore = weighted * 10;

	const explanationParts: string[] = [];
	if (eligibility >= 0.9) {
		explanationParts.push(
			`Matched ${formatApplicantType(org.applicantType)} eligibility`,
		);
	} else if (eligibility >= 0.7) {
		explanationParts.push('Broad organizational eligibility');
	}

	if (overlap.length > 0) {
		explanationParts.push(
			`Shared focus keywords: ${overlap.slice(0, 3).join(', ')}`,
		);
	}

	if (geography >= 0.95) {
		explanationParts.push('Nationwide eligibility');
	} else if (geography >= 0.85) {
		explanationParts.push('Geography overlap');
	}

	if (funding >= 0.8) {
		explanationParts.push('Funding within your range');
	} else if (amount === null) {
		explanationParts.push('Funding amount unavailable');
	}

	const explanation =
		explanationParts.join(' + ') ||
		`Relevance estimated for ${formatApplicantType(org.applicantType)}.`;

	return { fitScore, subscores, explanation };
}
