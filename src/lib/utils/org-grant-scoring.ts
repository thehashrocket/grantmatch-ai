// src/lib/utils/org-grant-scoring.ts

export const SCORING_VERSION = 4;

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
	preferredAwardMin: number | null;
	preferredAwardMax: number | null;
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
}): { score: number; overlap: string[]; hasPriorityHit: boolean } {
	const priorityTokens = dedupe(
		params.priorityFocusKeywords.flatMap((keyword) => tokenize(keyword)),
	);
	const focusTokens = dedupe(params.focusAreas.flatMap((keyword) => tokenize(keyword)));
	const purposeTokens = dedupe(tokenize(params.purpose ?? ''));

	if (purposeTokens.length === 0) {
		return { score: 0.5, overlap: [], hasPriorityHit: false };
	}

	const purposeSet = new Set(purposeTokens);
	const priorityOverlap = priorityTokens.filter((token) => purposeSet.has(token));
	const focusOverlap = focusTokens.filter((token) => purposeSet.has(token));

	const priorityHitRatio =
		priorityTokens.length === 0
			? 0
			: priorityOverlap.length / priorityTokens.length;
	const focusHitRatio =
		focusTokens.length === 0 ? 0 : focusOverlap.length / focusTokens.length;

	const combined = 0.7 * priorityHitRatio + 0.3 * focusHitRatio;
	let score = clamp(0.25 + combined * 0.9, 0, 1);

	if (priorityOverlap.length >= 3 || focusOverlap.length >= 3) {
		score = clamp(score + 0.05, 0, 1);
	}

	const orderedOverlap = [
		...priorityOverlap,
		...focusOverlap.filter((token) => !priorityOverlap.includes(token)),
	];

	return {
		score,
		overlap: orderedOverlap.slice(0, 5),
		hasPriorityHit: priorityOverlap.length > 0,
	};
}

function calculateFundingScore(
	budgetRange: BudgetRange | null,
	preferredAwardMin: number | null,
	preferredAwardMax: number | null,
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

	if (preferredAwardMin !== null && preferredAwardMax !== null) {
		const inRange =
			grantAmount >= preferredAwardMin && grantAmount <= preferredAwardMax;
		return { score: inRange ? 0.9 : 0.5, inRange };
	}

	if (preferredAwardMin !== null) {
		const inRange = grantAmount >= preferredAwardMin;
		return { score: inRange ? 0.8 : 0.45, inRange };
	}

	if (preferredAwardMax !== null) {
		const inRange = grantAmount <= preferredAwardMax;
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
	const { score: purpose, overlap, hasPriorityHit } = calculatePurposeScore({
		priorityFocusKeywords: org.priorityFocusKeywords ?? [],
		focusAreas: org.focusAreas,
		purpose: grant.purpose,
	});
	const amount = selectGrantAmount(grant);
	const { score: funding } = calculateFundingScore(
		org.budgetRange,
		org.preferredAwardMin,
		org.preferredAwardMax,
		amount,
	);

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

	const explanationParts: string[] = [];
	if (eligibility >= 0.9) {
		explanationParts.push(
			`Matched ${formatEntityType(org.entityType)} eligibility`,
		);
	} else if (eligibility >= 0.7) {
		explanationParts.push('Broad organizational eligibility');
	}

	if (overlap.length > 0) {
		if (hasPriorityHit) {
			explanationParts.push(
				`Matched priority focus: ${overlap.slice(0, 2).join(', ')}`,
			);
		} else {
			explanationParts.push(
				`Shared focus keywords: ${overlap.slice(0, 3).join(', ')}`,
			);
		}
		if (purpose >= 0.8) {
			explanationParts.push('Strong mission match');
		}
	}

	if (geography >= 0.9 || isNational) {
		explanationParts.push('Nationwide eligibility');
	} else if (geography >= 0.75) {
		explanationParts.push('Geography overlap');
	} else if (geographyOverlap.length > 0) {
		explanationParts.push(
			`Service area match: ${geographyOverlap.slice(0, 2).join(', ')}`,
		);
	}

	if (funding >= 0.8) {
		explanationParts.push('Funding within your range');
	} else if (amount === null) {
		explanationParts.push('Funding amount unavailable');
	}

	const explanation =
		explanationParts.join(' + ') ||
		`Relevance estimated for ${formatEntityType(org.entityType)}.`;

	return { fitScore, subscores, explanation };
}
