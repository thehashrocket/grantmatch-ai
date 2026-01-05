// src/lib/types/grant.ts

import type { Confidence, MissingSignal } from '@/lib/utils/org-grant-scoring';

export interface GrantMatch {
	id: string;
	title: string;
	url: string;
	internalUrl: string;
	fitScore: number;
	explanation: string;
	subscores?: Record<string, unknown> | null;
	subscoresJson?: unknown | null;
	confidence?: Confidence;
	scoreSummary?: string;
	scoreReasons?: { matched: string[]; missing: string[]; unknown: string[] };
	reasons?: MatchReason[];
	missing?: MissingSignal[];
	matches?: {
		priorityMatches: string[];
		focusMatches: string[];
		geographyOverlap: string[];
		amountInRange: boolean | null;
	};
	fundingAmount: number | null;
	estimatedTotalFunding?: number | null;
	awardFloor?: number | null;
	awardCeiling?: number | null;
	deadline: string | null;
	daysUntilDeadline?: number | null;
	source: string; // State name or 'Federal'
	detailsStatus?: 'UNKNOWN' | 'FETCHING' | 'AVAILABLE' | 'FAILED';
	detailsFetchedAt?: string | null;
	status?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
	closedAt?: string | null;
}

export interface PaginatedGrantMatches {
	grants: GrantMatch[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
	};
	matchIndexStatus?: string | null;
	usedOrgMatches?: boolean;
}

export interface GrantSearchFilters {
	textSearch: string;
	minFunding: string;
	maxFunding: string;
	minDeadline: string;
	maxDeadline: string;
	deadlineWithinDays: string;
	minFitScore: string;
	maxFitScore: string;
	source: string;
	sort: GrantSortOption;
}

export type GrantSortOption =
	| 'FIT_DESC'
	| 'DEADLINE_ASC'
	| 'DEADLINE_DESC'
	| 'NEWEST';

export type FitScoreCategory = 'high' | 'medium' | 'low';

export type MatchReasonStrength = 'strong' | 'medium' | 'neutral' | 'weak';

export type MatchReason = {
	label: string;
	detail?: string | null;
	strength: MatchReasonStrength;
};

export const getFitScoreCategory = (score: number): FitScoreCategory => {
	if (score >= 8) return 'high';
	if (score >= 5) return 'medium';
	return 'low';
};

export const getFitScoreColor = (category: FitScoreCategory): string => {
	switch (category) {
		case 'high':
			return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
		case 'medium':
			return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
		case 'low':
			return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
	}
};
