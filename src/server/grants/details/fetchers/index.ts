import { $Enums } from '@/prisma/generated/client';

import type { GrantDetailFetcher } from '@/server/grants/details/types';
import { californiaNoopFetcher } from '@/server/grants/details/fetchers/californiaNoopFetcher';
import { federalApply07Fetcher } from '@/server/grants/details/fetchers/federalApply07Fetcher';

export function getDetailFetcher(
	source: $Enums.GrantSource,
): GrantDetailFetcher {
	switch (source) {
		case $Enums.GrantSource.FEDERAL:
			return federalApply07Fetcher;
		case $Enums.GrantSource.CALIFORNIA:
			return californiaNoopFetcher;
		default:
			throw new Error('Detail fetcher not implemented for source');
	}
}
