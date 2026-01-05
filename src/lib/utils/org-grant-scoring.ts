// src/lib/utils/org-grant-scoring.ts

export const SCORING_VERSION = 5;

export type Confidence = 'HIGH' | 'MED' | 'LOW';
export type MissingSignal = 'PURPOSE' | 'APPLICANTS' | 'GEOGRAPHY' | 'FUNDING';
export type MissingFlags = {
	purpose: boolean;
	eligibleApplicants: boolean;
	eligibleGeographies: boolean;
	fundingAmount: boolean;
};

export type Reason = {
	label: string;
	detail?: string;
	strength: 'strong' | 'medium' | 'neutral' | 'weak';
};

export type MatchExplain = {
	reasons: Reason[];
	confidence: Confidence;
	missing: MissingFlags | MissingSignal[];
	matches?: {
		priorityMatches: string[];
		focusMatches: string[];
		geographyOverlap: string[];
		amountInRange: boolean | null;
	};
	overlap?: {
		priority: string[];
		focus: string[];
		geography: string[];
	};
};

type ApplicantType =
	| 'NONPROFIT'
	| 'SCHOOL'
	| 'GOVERNMENT'
	| 'TRIBE'
	| 'FOR_PROFIT'
	| 'INDIVIDUAL'
	| 'OTHER';

type EntityType =
	| 'NONPROFIT_501C3'
	| 'NONPROFIT_OTHER'
	| 'FISCAL_SPONSOR'
	| 'GOVERNMENT'
	| 'TRIBE'
	| 'SCHOOL'
	| 'FOR_PROFIT'
	| 'INDIVIDUAL'
	| 'OTHER';

type BudgetRange =
	| 'LT_50K'
	| 'FROM_50K_TO_250K'
	| 'FROM_250K_TO_1M'
	| 'FROM_1M_TO_5M'
	| 'OVER_5M';

type OrganizationProfile = {
	focusAreas: string[];
	priorityFocusKeywords: string[];
	serviceAreas: string[];
	entityType: EntityType | null;
	budgetRange: BudgetRange | null;
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
	purpose: 0.55,
	eligibility: 0.25,
	geography: 0.15,
	funding: 0.05,
};

const entityKeywordMap: Record<EntityType, string[]> = {
	NONPROFIT_501C3: ['501c3', '501(c)(3)', 'nonprofit'],
	NONPROFIT_OTHER: ['nonprofit', 'non-profit'],
	FISCAL_SPONSOR: ['fiscal sponsor'],
	GOVERNMENT: ['government', 'public agency', 'city', 'county', 'state'],
	TRIBE: ['tribe', 'tribal', 'indigenous', 'native'],
	SCHOOL: ['school', 'education', 'k-12', 'university', 'college'],
	FOR_PROFIT: ['for-profit', 'business', 'company', 'corporation', 'startup'],
	INDIVIDUAL: ['individual', 'resident', 'person'],
	OTHER: [],
};

const BUDGET_RANGE_ESTIMATE: Record<BudgetRange, number> = {
	LT_50K: 35000,
	FROM_50K_TO_250K: 150000,
	FROM_250K_TO_1M: 625000,
	FROM_1M_TO_5M: 3000000,
	OVER_5M: 6000000,
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

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function toNumber(value: number | bigint | null | undefined): number | null {
	if (value === null || value === undefined) return null;
	return typeof value === 'bigint' ? Number(value) : value;
}

function _escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateEligibilityScore(params: {
	entityType: EntityType | null;
	eligibleApplicants: string | null;
}): number {
	const normalized = normalizeText(params.eligibleApplicants);
	const compact = normalized.replace(/[^a-z0-9]/g, '');
	if (!normalized) return 0.6;

	const profileType = params.entityType;
	const has501c3 = compact.includes('501c3');

	if (profileType === 'NONPROFIT_501C3' && has501c3) {
		return 1;
	}

	const keywords = profileType ? (entityKeywordMap[profileType] ?? []) : [];
	const matchesProfileType = keywords.some((keyword) =>
		normalized.includes(keyword),
	);
	if (matchesProfileType) {
		return profileType === 'NONPROFIT_501C3' ? 0.95 : 0.9;
	}

	if (!profileType && has501c3) {
		return 0.85;
	}

	if (
		mixedEligibilityKeywords.some((keyword) => normalized.includes(keyword))
	) {
		return 0.7;
	}

	const matchesOtherType = Object.entries(entityKeywordMap)
		.filter(([type]) => type !== profileType)
		.some(([, otherKeywords]) =>
			otherKeywords.some((keyword) => normalized.includes(keyword)),
		);

	return matchesOtherType ? 0.45 : 0.55;
}

function calculateGeographyScore(
	serviceAreas: string[],
	eligibleGeographies: string | null,
): {
	score: number;
	overlap: string[];
	isLocalish: boolean;
	isNational: boolean;
} {
	const normalized = normalizeText(eligibleGeographies);
	const normalizedAreas = dedupe(
		serviceAreas.map((keyword) => normalizeText(keyword)).filter(Boolean),
	);

	if (!normalized) {
		return {
			score: normalizedAreas.length > 0 ? 0.55 : 0.6,
			overlap: [],
			isLocalish: false,
			isNational: false,
		};
	}

	const hasNationalScope =
		normalized.includes('nationwide') || normalized.includes('national');
	if (hasNationalScope) {
		return {
			score: 0.9,
			overlap: normalizedAreas,
			isLocalish: false,
			isNational: true,
		};
	}

	const isLocalish =
		normalized.includes('county') ||
		normalized.includes('local') ||
		normalized.includes('city');

	const overlap = normalizedAreas.filter((keyword) =>
		normalized.includes(keyword),
	);

	let baseScore = 0.6;
	if (normalized.includes('state')) {
		baseScore = 0.82;
	} else if (isLocalish) {
		baseScore = 0.7;
	}

	if (overlap.length > 0) {
		return {
			score: Math.min(1, baseScore + 0.15 + overlap.length * 0.02),
			overlap,
			isLocalish,
			isNational: false,
		};
	}

	if (isLocalish) {
		baseScore = 0.55;
	}

	return { score: baseScore, overlap: [], isLocalish, isNational: false };
}

function calculatePurposeScore(params: {
	priorityFocusKeywords: string[];
	focusAreas: string[];
	purpose: string | null;
}): {
	score: number;
	displayMatches: string[];
	priorityMatches: string[];
	focusMatches: string[];
	hasPriorityHit: boolean;
} {
	const priorityPhrases = params.priorityFocusKeywords
		.map((keyword) => normalizeText(keyword))
		.filter((phrase) => phrase.length >= 3);
	const priorityTokens = dedupe(
		params.priorityFocusKeywords.flatMap((keyword) => tokenize(keyword)),
	);
	const focusTokens = dedupe(
		params.focusAreas.flatMap((keyword) => tokenize(keyword)),
	);

	const purposeNormalized = normalizeText(params.purpose ?? '');
	const purposeTokens = dedupe(tokenize(params.purpose ?? ''));

	if (purposeTokens.length === 0 && purposeNormalized.length === 0) {
		return {
			score: 0.5,
			displayMatches: [],
			priorityMatches: [],
			focusMatches: [],
			hasPriorityHit: false,
		};
	}

	const phraseMatches = priorityPhrases
		.map((phrase, index) => ({
			phrase,
			original: params.priorityFocusKeywords[index],
		}))
		.filter((entry) => entry.phrase.length > 0)
		.filter((entry) => purposeNormalized.includes(entry.phrase))
		.map((entry) => entry.original.trim() || entry.phrase);

	const purposeSet = new Set(purposeTokens);
	const priorityTokenMatches = priorityTokens.filter((token) =>
		purposeSet.has(token),
	);
	const focusTokenMatches = focusTokens.filter((token) =>
		purposeSet.has(token),
	);

	let priorityHitRatio =
		priorityTokens.length === 0
			? 0
			: priorityTokenMatches.length / priorityTokens.length;
	const focusHitRatio =
		focusTokens.length === 0
			? 0
			: focusTokenMatches.length / focusTokens.length;

	if (phraseMatches.length > 0) {
		priorityHitRatio = Math.max(priorityHitRatio, 0.9);
	}

	const combined = 0.7 * priorityHitRatio + 0.3 * focusHitRatio;
	let score = clamp(
		0.25 + combined * 0.9 + (phraseMatches.length > 0 ? 0.05 : 0),
		0,
		1,
	);

	if (priorityTokenMatches.length >= 3 || focusTokenMatches.length >= 3) {
		score = clamp(score + 0.05, 0, 1);
	}

	const displayMatches = [
		...phraseMatches,
		...priorityTokenMatches.filter(
			(token) =>
				!phraseMatches.some((phrase) => phrase.toLowerCase() === token),
		),
		...focusTokenMatches.filter(
			(token) =>
				!phraseMatches.some((phrase) => phrase.toLowerCase() === token),
		),
	].slice(0, 5);

	const priorityMatches = [
		...phraseMatches,
		...priorityTokenMatches.filter(
			(token) =>
				!phraseMatches.some((phrase) => phrase.toLowerCase() === token),
		),
	].slice(0, 3);

	const focusMatches = focusTokenMatches.slice(0, 3);

	return {
		score,
		displayMatches,
		priorityMatches,
		focusMatches,
		hasPriorityHit: phraseMatches.length > 0 || priorityTokenMatches.length > 0,
	};
}

function calculateFundingScore(
	budgetRange: BudgetRange | null,
	minAward: number | null,
	maxAward: number | null,
	grantAmount: number | null,
): { score: number; inRange: boolean } {
	if (grantAmount === null) {
		return { score: 0.5, inRange: false };
	}

	if (budgetRange) {
		const budgetSize = BUDGET_RANGE_ESTIMATE[budgetRange];
		const ratio = grantAmount / budgetSize;
		if (ratio >= 0.05 && ratio <= 0.3) {
			return { score: 0.95, inRange: true };
		}
		if (ratio >= 0.03 && ratio <= 0.5) {
			return { score: 0.85, inRange: true };
		}
		if (ratio >= 0.02 && ratio <= 0.8) {
			return { score: 0.7, inRange: false };
		}
		return { score: 0.45, inRange: false };
	}

	if (minAward !== null && maxAward !== null) {
		const inRange = grantAmount >= minAward && grantAmount <= maxAward;
		return { score: inRange ? 0.9 : 0.5, inRange };
	}

	if (minAward !== null) {
		const inRange = grantAmount >= minAward;
		return { score: inRange ? 0.8 : 0.45, inRange };
	}

	if (maxAward !== null) {
		const inRange = grantAmount <= maxAward;
		return { score: inRange ? 0.8 : 0.45, inRange };
	}

	return { score: 0.5, inRange: false };
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

function formatEntityType(entityType: EntityType | null): string {
	if (!entityType) return 'organization';
	if (entityType === 'NONPROFIT_501C3') return '501(c)(3) nonprofit';
	return entityType
		.toLowerCase()
		.replace(/_/g, ' ')
		.replace(/(^|\s)(\w)/g, (match) => match.toUpperCase());
}

export function getApplicantType(
	entityType: EntityType | null,
): ApplicantType | null {
	switch (entityType) {
		case 'NONPROFIT_501C3':
		case 'NONPROFIT_OTHER':
		case 'FISCAL_SPONSOR':
			return 'NONPROFIT';
		case 'SCHOOL':
			return 'SCHOOL';
		case 'GOVERNMENT':
			return 'GOVERNMENT';
		case 'TRIBE':
			return 'TRIBE';
		case 'FOR_PROFIT':
			return 'FOR_PROFIT';
		case 'INDIVIDUAL':
			return 'INDIVIDUAL';
		case 'OTHER':
			return 'OTHER';
		default:
			return null;
	}
}

export function computeOrgGrantFitScore(
	org: OrganizationProfile,
	grant: GrantForScoring,
): {
	fitScore: number;
	subscores: Subscores;
	explanation: string;
	reasons: Reason[];
	confidence: Confidence;
	missing: MissingFlags;
	matches: {
		priorityMatches: string[];
		focusMatches: string[];
		geographyOverlap: string[];
		amountInRange: boolean | null;
	};
	overlap: {
		priority: string[];
		focus: string[];
		geography: string[];
	};
} {
	const eligibility = calculateEligibilityScore({
		entityType: org.entityType,
		eligibleApplicants: grant.eligibleApplicants,
	});
	const {
		score: geography,
		overlap: geographyOverlap,
		isLocalish,
		isNational,
	} = calculateGeographyScore(org.serviceAreas, grant.eligibleGeographies);
	const {
		score: purpose,
		displayMatches,
		priorityMatches,
		focusMatches,
		hasPriorityHit,
	} = calculatePurposeScore({
		priorityFocusKeywords: org.priorityFocusKeywords ?? [],
		focusAreas: org.focusAreas,
		purpose: grant.purpose,
	});
	const amount = selectGrantAmount(grant);
	const { score: funding, inRange } = calculateFundingScore(
		org.budgetRange,
		org.minAward,
		org.maxAward,
		amount,
	);

	const missing: MissingFlags = {
		purpose: !normalizeText(grant.purpose),
		eligibleApplicants: !normalizeText(grant.eligibleApplicants),
		eligibleGeographies: !normalizeText(grant.eligibleGeographies),
		fundingAmount: amount === null,
	};

	const criticalMissingCount =
		(missing.purpose ? 1 : 0) +
		(missing.eligibleApplicants ? 1 : 0) +
		(missing.eligibleGeographies ? 1 : 0);
	let confidence: Confidence =
		criticalMissingCount === 0
			? 'HIGH'
			: criticalMissingCount === 1
				? 'MED'
				: 'LOW';
	if (missing.fundingAmount && confidence !== 'LOW') {
		confidence = confidence === 'HIGH' ? 'MED' : 'LOW';
	}

	const weightedBase =
		purpose * WEIGHTS.purpose +
		eligibility * WEIGHTS.eligibility +
		geography * WEIGHTS.geography +
		funding * WEIGHTS.funding;

	// Minor bias toward purpose to keep strong mission matches high.
	let total = weightedBase + purpose * 0.03;

	if (eligibility < 0.5) {
		total *= 0.6;
	}

	const localMismatch = isLocalish && geographyOverlap.length === 0;
	if (localMismatch) {
		total *= 0.7;
	}

	if (funding < 0.45) {
		total *= 0.85;
	}

	total = clamp(total, 0, 1);

	const subscores: Subscores = { eligibility, geography, purpose, funding };
	const fitScore = total * 10;

	type ReasonCategory =
		| 'purpose'
		| 'eligibility'
		| 'geography'
		| 'funding'
		| 'penalty';

	const candidateReasons: Array<
		Reason & { category: ReasonCategory; order: number }
	> = [];

	if (hasPriorityHit && displayMatches.length > 0) {
		candidateReasons.push({
			label: 'Priority focus match',
			detail: (priorityMatches.length > 0 ? priorityMatches : displayMatches)
				.slice(0, 3)
				.join(', '),
			strength: 'strong',
			category: 'purpose',
			order: candidateReasons.length,
		});
	} else if (focusMatches.length > 0) {
		candidateReasons.push({
			label: 'Focus area match',
			detail: focusMatches.slice(0, 3).join(', '),
			strength: 'medium',
			category: 'purpose',
			order: candidateReasons.length,
		});
	}

	if (
		purpose >= 0.85 &&
		!candidateReasons.some((reason) => reason.category === 'purpose')
	) {
		const detail = displayMatches.slice(0, 3).join(', ');
		candidateReasons.push({
			label: 'Strong mission match',
			detail: detail.length > 0 ? detail : undefined,
			strength: 'strong',
			category: 'purpose',
			order: candidateReasons.length,
		});
	}

	if (eligibility >= 0.9) {
		candidateReasons.push({
			label: `Eligible for ${formatEntityType(org.entityType)}`,
			strength: 'strong',
			category: 'eligibility',
			order: candidateReasons.length,
		});
	} else if (eligibility >= 0.7) {
		candidateReasons.push({
			label: 'Likely eligible',
			strength: 'medium',
			category: 'eligibility',
			order: candidateReasons.length,
		});
	}

	if (geography >= 0.9 || isNational) {
		candidateReasons.push({
			label: 'Nationwide eligibility',
			strength: 'strong',
			category: 'geography',
			order: candidateReasons.length,
		});
	} else if (geographyOverlap.length > 0) {
		candidateReasons.push({
			label: 'Service area overlap',
			detail: geographyOverlap.slice(0, 3).join(', '),
			strength: 'medium',
			category: 'geography',
			order: candidateReasons.length,
		});
	}

	if (localMismatch) {
		candidateReasons.push({
			label: 'Local eligibility mismatch',
			strength: 'weak',
			category: 'penalty',
			order: candidateReasons.length,
		});
	}

	const hasPreferredRange =
		org.budgetRange !== null || org.minAward !== null || org.maxAward !== null;
	if (amount === null) {
		candidateReasons.push({
			label: 'Funding not listed',
			strength: 'neutral',
			category: 'funding',
			order: candidateReasons.length,
		});
	} else if (inRange && hasPreferredRange) {
		candidateReasons.push({
			label: org.budgetRange
				? 'Funding fits your budget range'
				: 'Funding within your preferred range',
			strength: org.budgetRange ? 'strong' : 'medium',
			category: 'funding',
			order: candidateReasons.length,
		});
	} else if (amount !== null) {
		candidateReasons.push({
			label: 'Funding listed',
			strength: 'neutral',
			category: 'funding',
			order: candidateReasons.length,
		});
	}

	if (amount !== null && hasPreferredRange && !inRange) {
		candidateReasons.push({
			label: 'Funding likely outside your preferred range',
			strength: 'weak',
			category: 'penalty',
			order: candidateReasons.length,
		});
	}

	const strengthRank: Record<Reason['strength'], number> = {
		strong: 0,
		medium: 1,
		neutral: 2,
		weak: 3,
	};
	const categoryRank: Record<ReasonCategory, number> = {
		purpose: 0,
		eligibility: 1,
		geography: 2,
		funding: 3,
		penalty: 4,
	};

	const reasons = candidateReasons
		.slice()
		.sort((a, b) => {
			const strengthDiff = strengthRank[a.strength] - strengthRank[b.strength];
			if (strengthDiff !== 0) return strengthDiff;
			const categoryDiff = categoryRank[a.category] - categoryRank[b.category];
			if (categoryDiff !== 0) return categoryDiff;
			return a.order - b.order;
		})
		.slice(0, 4)
		.map(({ category: _category, order: _order, ...reason }) => reason);

	const explanation =
		hasPriorityHit || focusMatches.length > 0
			? 'Strong alignment with your priorities and eligibility.'
			: 'Relevance estimated from mission, eligibility, geography, and funding.';

	const matches = {
		priorityMatches,
		focusMatches,
		geographyOverlap,
		amountInRange: amount === null ? null : inRange,
	};
	const overlap = {
		priority: priorityMatches,
		focus: focusMatches,
		geography: geographyOverlap,
	};

	return {
		fitScore,
		subscores,
		explanation,
		reasons,
		confidence,
		missing,
		matches,
		overlap,
	};
}
