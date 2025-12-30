import { $Enums } from '@/prisma/generated/client';

import type { GrantDetailFetcher } from '@/server/grants/details/types';
import { californiaNoopFetcher } from '@/server/grants/details/fetchers/californiaNoopFetcher';
import { federalFetchOpportunityFetcher } from '@/server/grants/details/fetchers/federalFetchOpportunityFetcher';

export function getDetailFetcher(
	source: $Enums.GrantSource,
): GrantDetailFetcher {
	switch (source) {
		case $Enums.GrantSource.FEDERAL:
			return federalFetchOpportunityFetcher;
		case $Enums.GrantSource.CALIFORNIA:
			return californiaNoopFetcher;
		default:
			throw new Error('Detail fetcher not implemented for source');
	}
}
