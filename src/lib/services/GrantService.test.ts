import { describe, expect, it } from 'vitest';
import {
	GrantServiceImpl,
	type GrantService,
} from '@/lib/services/GrantService';
import type {
	GrantMatchRecord,
	GrantRecord,
	GrantRepository,
} from '@/lib/repositories/GrantRepository';
import type { GrantSearchFilters } from '@/lib/types/grant';

const baseGrant: GrantRecord = {
	id: 'g1',
	title: 'Test Grant',
	url: 'https://example.com',
	deadline: null,
	deadlineType: null,
	openDate: null,
	openDateType: null,
	stateAgency: null,
	matchFunding: null,
	estimatedTotalFunding: null,
	awardFloor: null,
	awardCeiling: null,
	estimatedAwardAmounts: null,
	fundsDisbursment: null,
	currentAsOf: null,
	grantor: 'Grantor',
	portalId: null,
	opportunityType: null,
	purpose: 'Housing support',
	eligibleApplicants: 'Nonprofit',
	eligibleGeographies: 'California',
	fitScore: null,
	fitScoreVersion: 1,
	fitScoreComputedAt: null,
	createdAt: new Date(),
	updatedAt: new Date(),
	source: 'CALIFORNIA',
	status: 'OPEN',
	closedAt: null,
	detailsStatus: 'UNKNOWN',
	detailsFetchedAt: null,
};

class MockGrantRepository implements GrantRepository {
	public usedOrgPath = false;
	public usedLegacyPath = false;

	async findWithFilters(_filters: GrantSearchFilters): Promise<GrantRecord[]> {
		return [baseGrant];
	}

	async findWithFiltersPaginated(
		_filters: GrantSearchFilters,
		_page: number,
		_pageSize: number,
	): Promise<{ grants: GrantRecord[]; total: number }> {
		this.usedLegacyPath = true;
		return { grants: [baseGrant], total: 1 };
	}

	async findWithFiltersPaginatedForOrg(
		_filters: GrantSearchFilters,
		_page: number,
		_pageSize: number,
		_organizationId: string,
	): Promise<{ matches: GrantMatchRecord[]; total: number }> {
		this.usedOrgPath = true;
		return {
			matches: [
				{
					fitScore: 9.5,
					subscoresJson: null,
					explanation: 'Org-specific match',
					grant: { ...baseGrant },
				},
			],
			total: 1,
		};
	}

	async findById(_id: string): Promise<GrantRecord | null> {
		return baseGrant;
	}
}

describe('GrantServiceImpl', () => {
	const filters: GrantSearchFilters = {
		textSearch: '',
		minFunding: '',
		maxFunding: '',
		minDeadline: '',
		maxDeadline: '',
		deadlineWithinDays: '',
		minFitScore: '',
		maxFitScore: '',
		source: 'ALL',
		sort: 'FIT_DESC',
	};

	it('uses org-aware path when organizationId is provided', async () => {
		const repo = new MockGrantRepository();
		const service: GrantService = new GrantServiceImpl(repo);

		const result = await service.searchGrantsPaginated(filters, 1, 10, 'org-1');

		expect(repo.usedOrgPath).toBe(true);
		expect(result.grants[0].fitScore).toBe(9.5);
		expect(result.grants[0].explanation).toBe('Org-specific match');
	});

	it('falls back to legacy path when no organizationId', async () => {
		const repo = new MockGrantRepository();
		const service: GrantService = new GrantServiceImpl(repo);

		const result = await service.searchGrantsPaginated(filters, 1, 10, null);

		expect(repo.usedLegacyPath).toBe(true);
		expect(result.grants[0].fitScore).not.toBeNull();
	});
});
