import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import type { GrantMatch } from '@/lib/types/grant';

// This is temporary mock data - replace with actual database queries later
const MOCK_GRANTS: GrantMatch[] = [
  {
    id: '1',
    title: 'Community Development Grant',
    url: 'https://example.com/grant1',
    fitScore: 9.2,
    explanation: 'This grant aligns perfectly with your organization\'s focus on community development and social services. The funding priorities match your mission statement, and your track record in similar projects makes you a strong candidate.',
    fundingAmount: 50000,
    deadline: '2024-06-30',
  },
  {
    id: '2',
    title: 'Youth Education Initiative',
    url: 'https://example.com/grant2',
    fitScore: 7.5,
    explanation: 'While your organization has some experience in youth programs, this grant requires more specific focus on STEM education. However, your community engagement track record is a plus.',
    fundingAmount: 25000,
    deadline: '2024-07-15',
  },
  {
    id: '3',
    title: 'Environmental Sustainability Fund',
    url: 'https://example.com/grant3',
    fitScore: 4.8,
    explanation: 'This grant\'s primary focus on environmental projects is somewhat outside your organization\'s core mission. Consider how you could incorporate environmental aspects into your existing programs.',
    fundingAmount: 75000,
    deadline: '2024-08-01',
  },
];

export const grantsRouter = router({
  getMatches: publicProcedure
    .query(async () => {
      // TODO: Implement actual database query and AI matching logic
      return MOCK_GRANTS;
    }),
}); 