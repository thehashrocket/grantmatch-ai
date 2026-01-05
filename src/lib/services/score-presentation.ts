import { getFitScoreCategory } from '@/lib/types/grant';
import {
	getFundingAmountInfo,
	type FundingAmountInput,
	type FundingAmountStatus,
} from '@/lib/utils/funding-amount';

type ScoreReasonBuckets = {
	matched: string[];
	missing: string[];
	unknown: string[];
};

type ScorePresentationGrant = FundingAmountInput & {
	fitScore: number;
	purpose?: string | null;
	eligibleApplicants?: string | null;
	eligibleGeographies?: string | null;
	deadline?: Date | string | null;
};

const hasContent = (value?: string | null) =>
	value !== null && value !== undefined && value.trim().length > 0;

const normalizeReason = (reason: string) => reason.trim().replace(/\.+$/, '');

const lowercaseFirst = (text: string) =>
	text.length > 0 ? text.charAt(0).toLowerCase() + text.slice(1) : text;

const uniqueList = (items: string[]) => Array.from(new Set(items));

const extractSubscore = (
	subscores?: Record<string, unknown> | null,
	key?: string,
): number | null => {
	if (!subscores || !key) return null;
	const value = subscores[key];
	return typeof value === 'number' ? value : null;
};

const interpretScore = (
	score: number | null,
	thresholds: { strong: number; ok: number },
	texts: { strong: string; ok: string; weak: string },
	reasons: ScoreReasonBuckets,
) => {
	if (score === null) return;
	if (score >= thresholds.strong) {
		reasons.matched.push(texts.strong);
		return;
	}
	if (score >= thresholds.ok) {
		reasons.matched.push(texts.ok);
		return;
	}
	reasons.missing.push(texts.weak);
};

const buildFundingReason = (
	score: number | null,
	status: FundingAmountStatus,
	reasons: ScoreReasonBuckets,
) => {
	if (score !== null) {
		if (score >= 0.78) {
			reasons.matched.push('Funding within your typical range');
			return;
		}
		if (score >= 0.45) {
			reasons.matched.push('Funding roughly aligns');
			return;
		}
		reasons.missing.push('Funding may be outside your range');
		return;
	}

	if (status === 'MISSING') {
		reasons.unknown.push('Funding not listed');
		return;
	}

	if (status === 'VARIES') {
		reasons.unknown.push('Funding varies by program');
		return;
	}

	reasons.matched.push('Funding amount listed');
};

const buildSummary = (
	fitScore: number,
	reasons: ScoreReasonBuckets,
	fallbackExplanation?: string,
) => {
	const category = getFitScoreCategory(fitScore);
	const positive =
		reasons.matched[0] ??
		(fallbackExplanation
			? fallbackExplanation.split('.').shift()?.trim()
			: 'Relevance looks promising');
	const gap = reasons.missing[0] ?? reasons.unknown[0];

	if (category === 'high') {
		return gap
			? `${positive}, with minor gaps (${lowercaseFirst(gap)})`
			: `${positive} with a strong overall fit`;
	}

	if (category === 'medium') {
		const gapText = gap ? lowercaseFirst(gap) : 'some details are unverified';
		return `${positive}, but ${gapText}`;
	}

	const gapText = gap ?? 'key details are missing';
	return `${gapText}; overall fit looks weak`;
};

const deriveConfidence = (
	subscores: Record<string, unknown> | null,
	signalsMissing: number,
) => {
	if (!subscores) {
		return signalsMissing > 1 ? 'LOW' : 'MEDIUM';
	}

	if (signalsMissing >= 3) return 'LOW';
	if (signalsMissing >= 1) return 'MEDIUM';
	return 'HIGH';
};

export const deriveScorePresentation = ({
	grant,
	subscores,
	fallbackExplanation,
}: {
	grant: ScorePresentationGrant;
	subscores?: Record<string, unknown> | null;
	fallbackExplanation?: string;
}): {
	confidence: 'HIGH' | 'MEDIUM' | 'LOW';
	scoreSummary: string;
	scoreReasons: ScoreReasonBuckets;
} => {
	const reasons: ScoreReasonBuckets = { matched: [], missing: [], unknown: [] };
	const fundingInfo = getFundingAmountInfo({
		estimatedTotalFunding: grant.estimatedTotalFunding,
		awardFloor: grant.awardFloor,
		awardCeiling: grant.awardCeiling,
		fundingAmount: grant.fundingAmount,
		fundingVaries: grant.fundingVaries,
	});

	const hasPurpose = hasContent(grant.purpose);
	const hasApplicants = hasContent(grant.eligibleApplicants);
	const hasGeography = hasContent(grant.eligibleGeographies);
	const hasDeadline = !!grant.deadline;

	const purposeScore = extractSubscore(subscores, 'purpose');
	const eligibilityScore = extractSubscore(subscores, 'eligibility');
	const geographyScore = extractSubscore(subscores, 'geography');
	const fundingScore = extractSubscore(subscores, 'funding');

	if (purposeScore === null && hasPurpose) {
		reasons.matched.push('Purpose described for this grant');
	}
	if (purposeScore === null && !hasPurpose) {
		reasons.unknown.push('Purpose not listed');
	}
	if (eligibilityScore === null && hasApplicants) {
		reasons.matched.push('Eligibility details provided');
	}
	if (eligibilityScore === null && !hasApplicants) {
		reasons.unknown.push('Eligibility requirements not listed');
	}
	if (geographyScore === null && hasGeography) {
		reasons.matched.push('Geographic scope provided');
	}
	if (geographyScore === null && !hasGeography) {
		reasons.unknown.push('Eligible regions not specified');
	}

	interpretScore(
		purposeScore,
		{ strong: 0.78, ok: 0.45 },
		{
			strong: 'Purpose aligns with your focus areas',
			ok: 'Some mission overlap',
			weak: 'Purpose may not match your priorities',
		},
		reasons,
	);

	interpretScore(
		eligibilityScore,
		{ strong: 0.72, ok: 0.45 },
		{
			strong: 'Organization type looks eligible',
			ok: 'Eligibility likely works for you',
			weak: 'Eligibility may not fit your org type',
		},
		reasons,
	);

	interpretScore(
		geographyScore,
		{ strong: 0.78, ok: 0.5 },
		{
			strong: 'Service area overlaps this grant',
			ok: 'Some geographic overlap',
			weak: 'Geography may not match your service area',
		},
		reasons,
	);

	buildFundingReason(fundingScore, fundingInfo.status, reasons);

	if (!hasDeadline) {
		reasons.unknown.push('Deadline not provided');
	}

	const signalsMissing = [
		!hasPurpose,
		!hasApplicants,
		!hasGeography,
		fundingInfo.status === 'MISSING',
		!hasDeadline,
	].filter(Boolean).length;

	const confidence = deriveConfidence(subscores ?? null, signalsMissing) as
		| 'HIGH'
		| 'MEDIUM'
		| 'LOW';

	const scoreSummary = buildSummary(
		grant.fitScore,
		{
			matched: uniqueList(reasons.matched),
			missing: uniqueList(reasons.missing),
			unknown: uniqueList(reasons.unknown),
		},
		fallbackExplanation,
	);

	return {
		confidence,
		scoreSummary,
		scoreReasons: {
			matched: uniqueList(reasons.matched).map(normalizeReason),
			missing: uniqueList(reasons.missing).map(normalizeReason),
			unknown: uniqueList(reasons.unknown).map(normalizeReason),
		},
	};
};
