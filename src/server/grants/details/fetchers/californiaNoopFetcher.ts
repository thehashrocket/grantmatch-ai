import { Prisma } from '@/prisma/generated/client';

import type { GrantDetailFetcher, GrantDetailsResult, GrantWithRelations } from '@/server/grants/details/types';

const endpoint = 'california_noop';

function buildResponse(grant: GrantWithRelations): GrantDetailsResult {
  const now = new Date();
  if (grant.details) {
    return { detail: { fetchedAt: now }, attachments: [] };
  }

  return {
    detail: {
      fetchedAt: now,
      rawJson: { note: 'CA detail fetch not implemented' } as Prisma.InputJsonValue,
    },
    attachments: [],
  };
}

export const californiaNoopFetcher: GrantDetailFetcher = {
  endpoint,
  async fetch(grant: GrantWithRelations) {
    return buildResponse(grant);
  },
};
