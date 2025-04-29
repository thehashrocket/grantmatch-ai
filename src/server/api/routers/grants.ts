import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { db } from '@/lib/db';
import { type GrantMatch } from '@/lib/types/grant';
import { calculateGrantFitScore } from '@/lib/utils/grant-scoring';
import { type Prisma } from '@prisma/client';

export const grantsRouter = router({
  getMatches: publicProcedure
    .query(async () => {
      const grants = await db.grant.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        // Include all fields needed for scoring
        select: {
          id: true,
          title: true,
          url: true,
          deadline: true,
          deadlineType: true,
          openDate: true,
          openDateType: true,
          stateAgency: true,
          matchFunding: true,
          estimatedTotalFunding: true,
          estimatedAwardAmounts: true,
          fundsDisbursment: true,
          currentAsOf: true,
          grantor: true,
          portalId: true,
          opportunityType: true,
          purpose: true,
          eligibleApplicants: true,
          eligibleGeographies: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      // Transform the grants into GrantMatch format with calculated fit scores
      return grants.map(grant => {
        const fitScore = calculateGrantFitScore(grant);
        
        return {
          id: grant.id,
          title: grant.title,
          url: grant.url,
          fitScore,
          explanation: `This grant matches your organization's profile with a fit score of ${fitScore.toFixed(1)}/10. ${grant.purpose}`,
          fundingAmount: Number(grant.estimatedTotalFunding),
          deadline: grant.deadline?.toISOString() ?? new Date().toISOString(),
        } satisfies GrantMatch;
      }).sort((a, b) => b.fitScore - a.fitScore); // Sort by fit score descending
    }),
}); 