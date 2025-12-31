// src/lib/services/GrantService.ts
// called by src/server/api/routers/grants.ts

import type { GrantRepository } from '@/lib/repositories/GrantRepository';
import type { GrantRecord } from '@/lib/repositories/GrantRepository';
import type {
	GrantMatch,
	GrantSearchFilters,
	PaginatedGrantMatches,
} from '@/lib/types/grant';
import { calculateGrantFitScore } from '@/lib/utils/grant-scoring';

export interface GrantService {
	searchGrants(filters: GrantSearchFilters): Promise<GrantMatch[]>;
	searchGrantsPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<PaginatedGrantMatches>;
	getGrantById(id: string): Promise<GrantMatch | null>;
}

export class GrantServiceImpl implements GrantService {
	constructor(private grantRepository: GrantRepository) {}

	private mapGrantToMatch(grant: GrantRecord): GrantMatch {
		const fitScore = calculateGrantFitScore(grant);
		const estimatedTotalFunding =
			grant.estimatedTotalFunding !== null &&
			grant.estimatedTotalFunding !== undefined
				? Number(grant.estimatedTotalFunding)
				: null;
		const awardFloor =
			grant.awardFloor !== null && grant.awardFloor !== undefined
				? Number(grant.awardFloor)
				: null;
		const awardCeiling =
			grant.awardCeiling !== null && grant.awardCeiling !== undefined
				? Number(grant.awardCeiling)
				: null;

		return {
			id: grant.id,
			title: grant.title,
			url: grant.url,
			internalUrl: `/grants/${grant.id}`,
			fitScore,
			explanation: `This grant matches your organization's profile with a fit score of ${fitScore.toFixed(1)}/10. ${grant.purpose || 'No description available.'}`,
			fundingAmount: estimatedTotalFunding,
			estimatedTotalFunding,
			awardFloor,
			awardCeiling,
			deadline: grant.deadline?.toISOString() ?? new Date().toISOString(),
			source: grant.source,
			detailsStatus: grant.detailsStatus,
			detailsFetchedAt: grant.detailsFetchedAt
				? grant.detailsFetchedAt.toISOString()
				: null,
		};
	}

	async searchGrants(filters: GrantSearchFilters): Promise<GrantMatch[]> {
		// Get raw grants from repository
		const grants = await this.grantRepository.findWithFilters(filters);

		// Transform grants and calculate fit scores
		let grantMatches = grants.map((grant) => this.mapGrantToMatch(grant));

		// Apply fit score filtering if specified
		if (filters.minFitScore) {
			const minScore = parseFloat(filters.minFitScore);
			grantMatches = grantMatches.filter((grant) => grant.fitScore >= minScore);
		}

		if (filters.maxFitScore) {
			const maxScore = parseFloat(filters.maxFitScore);
			grantMatches = grantMatches.filter((grant) => grant.fitScore <= maxScore);
		}

		// Sort by fit score descending
		return grantMatches.sort((a, b) => b.fitScore - a.fitScore);
	}

	async searchGrantsPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<PaginatedGrantMatches> {
		// Get paginated raw grants from repository
		const { grants, total } =
			await this.grantRepository.findWithFiltersPaginated(
				filters,
				page,
				pageSize,
			);

		// Transform grants and calculate fit scores
		let grantMatches = grants.map((grant) => this.mapGrantToMatch(grant));

		// Apply fit score filtering if specified
		if (filters.minFitScore) {
			const minScore = parseFloat(filters.minFitScore);
			grantMatches = grantMatches.filter((grant) => grant.fitScore >= minScore);
		}

		if (filters.maxFitScore) {
			const maxScore = parseFloat(filters.maxFitScore);
			grantMatches = grantMatches.filter((grant) => grant.fitScore <= maxScore);
		}

		// Sort by fit score descending
		const sortedGrants = grantMatches.sort((a, b) => b.fitScore - a.fitScore);

		// Calculate pagination metadata
		const totalPages = Math.ceil(total / pageSize);

		return {
			grants: sortedGrants,
			pagination: {
				page,
				pageSize,
				total,
				totalPages,
			},
		};
	}

	async getGrantById(id: string): Promise<GrantMatch | null> {
		const grant = await this.grantRepository.findById(id);

		if (!grant) {
			return null;
		}

		return this.mapGrantToMatch(grant);
	}
}
