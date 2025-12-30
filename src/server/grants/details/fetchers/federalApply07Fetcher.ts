import { mapFederalApply07, type FederalDetails } from '@/server/grants/details/mappers/mapFederalApply07';
import type { GrantDetailFetcher } from '@/server/grants/details/types';
import { postFormWithRetry } from '@/server/grants/sources/federalClient';

export const FEDERAL_DETAILS_URL = 'https://apply07.grants.gov/grantsws/rest/opportunity/details';

export const federalApply07Fetcher: GrantDetailFetcher = {
  endpoint: FEDERAL_DETAILS_URL,
  async fetch(grant, opts) {
    if (!grant.sourceRecordId) {
      throw new Error('missing sourceRecordId');
    }

    const body = `oppId=${encodeURIComponent(grant.sourceRecordId)}`;
    const details = await postFormWithRetry<FederalDetails>(FEDERAL_DETAILS_URL, body, {
      timeoutMs: opts?.timeoutMs ?? 8000,
    });

    return mapFederalApply07(details, grant);
  },
};
