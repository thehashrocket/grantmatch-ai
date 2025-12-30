import { $Enums } from '@/prisma/generated/client';
import {
	mapFederalFetchOpportunity,
	type FederalFetchOpportunityResponse,
} from '@/server/grants/details/mappers/mapFederalFetchOpportunity';
import type { GrantDetailFetcher } from '@/server/grants/details/types';
import { postJsonWithRetry } from '@/server/grants/sources/federalClient';
import { federalApply07Fetcher } from '@/server/grants/details/fetchers/federalApply07Fetcher';

export const FEDERAL_FETCH_OPPORTUNITY_URL =
	'https://api.grants.gov/v1/api/fetchOpportunity';

export const federalFetchOpportunityFetcher: GrantDetailFetcher = {
	endpoint: FEDERAL_FETCH_OPPORTUNITY_URL,
	async fetch(grant, opts) {
		if (!grant.sourceRecordId && !grant.number) {
			throw new Error('missing sourceRecordId or opportunity number');
		}

		const body = {
			opportunityId: grant.sourceRecordId,
			opportunityNumber: grant.number ?? undefined,
		};

		try {
			const details = await postJsonWithRetry<FederalFetchOpportunityResponse>(
				FEDERAL_FETCH_OPPORTUNITY_URL,
				body,
				{ timeoutMs: opts?.timeoutMs ?? 12_000 },
			);

			if (!details?.data) {
				throw new Error('empty fetchOpportunity response');
			}

			return mapFederalFetchOpportunity(details, grant);
		} catch (error) {
			// Fall back to the legacy Apply07 endpoint if the new API fails.
			if (grant.source === $Enums.GrantSource.FEDERAL) {
				return federalApply07Fetcher.fetch(grant, opts);
			}
			throw error;
		}
	},
};
