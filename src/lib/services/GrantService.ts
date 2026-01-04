// src/lib/services/GrantService.ts
// called by src/server/api/routers/grants.ts

import type { GrantRepository } from '@/lib/repositories/GrantRepository';
import type {
	GrantMatchRecord,
	GrantRecord,
} from '@/lib/repositories/GrantRepository';
import type {
	GrantMatch,
	GrantSearchFilters,
	PaginatedGrantMatches,
} from '@/lib/types/grant';
import {
	calculateDaysUntilDeadline,
	calculateGrantFitScore,
} from '@/lib/utils/grant-scoring';

export interface GrantService {
	searchGrants(
		filters: GrantSearchFilters,
		organizationId?: string | null,
		matchIndexStatus?: string | null,
	): Promise<GrantMatch[]>;
	searchGrantsPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
		organizationId?: string | null,
		matchIndexStatus?: string | null,
	): Promise<PaginatedGrantMatches>;
	getGrantById(id: string): Promise<GrantMatch | null>;
}

export class GrantServiceImpl implements GrantService {
	constructor(private grantRepository: GrantRepository) {}

	private mapGrantToMatch(
		grant: GrantRecord,
		override?: { fitScore?: number; explanation?: string | null },
	): GrantMatch {
		const fitScore =
			override?.fitScore ??
			grant.fitScore ??
			calculateGrantFitScore({
				estimatedTotalFunding: grant.estimatedTotalFunding ?? null,
				eligibleApplicants: grant.eligibleApplicants ?? null,
				eligibleGeographies: grant.eligibleGeographies ?? null,
				purpose: grant.purpose ?? null,
			});
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
			explanation:
				override?.explanation ??
				`This grant matches your organization's profile with a fit score of ${fitScore.toFixed(1)}/10. ${grant.purpose || 'No description available.'}`,
			fundingAmount: estimatedTotalFunding,
			estimatedTotalFunding,
			awardFloor,
			awardCeiling,
			deadline: grant.deadline ? grant.deadline.toISOString() : null,
			daysUntilDeadline: calculateDaysUntilDeadline(grant.deadline ?? null),
			source: grant.source,
			detailsStatus: grant.detailsStatus,
			detailsFetchedAt: grant.detailsFetchedAt
				? grant.detailsFetchedAt.toISOString()
				: null,
			status: grant.status,
			closedAt: grant.closedAt ? grant.closedAt.toISOString() : null,
		};
	}

	async searchGrants(
		filters: GrantSearchFilters,
		_organizationId?: string | null,
		_matchIndexStatus?: string | null,
	): Promise<GrantMatch[]> {
		// Get raw grants from repository
		const grants = await this.grantRepository.findWithFilters(filters);

		// Transform grants and calculate fit scores for any legacy records missing them
		return grants.map((grant) => this.mapGrantToMatch(grant));
	}

	async searchGrantsPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
		organizationId?: string | null,
		matchIndexStatus?: string | null,
	): Promise<PaginatedGrantMatches> {
		if (organizationId) {
			const { matches, total } =
				await this.grantRepository.findWithFiltersPaginatedForOrg(
					filters,
					page,
					pageSize,
					organizationId,
				);

			const paginatedGrants = matches.map((match: GrantMatchRecord) =>
				this.mapGrantToMatch(match.grant, {
					fitScore: match.fitScore,
					explanation: match.explanation,
				}),
			);

			const totalPages = Math.ceil(total / pageSize);
			return {
				grants: paginatedGrants,
				pagination: {
					page,
					pageSize,
					total,
					totalPages,
				},
				matchIndexStatus: matchIndexStatus ?? null,
				usedOrgMatches: true,
			};
		}

		const { grants, total } =
			await this.grantRepository.findWithFiltersPaginated(
				filters,
				page,
				pageSize,
			);

		const paginatedGrants = grants.map((grant) => this.mapGrantToMatch(grant));
		const totalPages = Math.ceil(total / pageSize);

		return {
			grants: paginatedGrants,
			pagination: {
				page,
				pageSize,
				total,
				totalPages,
			},
			matchIndexStatus: matchIndexStatus ?? null,
			usedOrgMatches: false,
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
