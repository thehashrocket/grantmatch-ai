import { db } from '@/lib/db';
import { type GrantSearchFilters } from '@/components/grants/GrantSearchForm';

export interface GrantRepository {
  findWithFilters(filters: GrantSearchFilters): Promise<any[]>;
  findById(id: string): Promise<any | null>;
}

export class PrismaGrantRepository implements GrantRepository {
  async findWithFilters(filters: GrantSearchFilters): Promise<any[]> {
    // Build where conditions based on input filters
    const whereConditions: any = {};
    
    if (filters.textSearch) {
      whereConditions.OR = [
        { title: { contains: filters.textSearch, mode: 'insensitive' } },
        { purpose: { contains: filters.textSearch, mode: 'insensitive' } },
      ];
    }
    
    if (filters.minFunding) {
      whereConditions.estimatedTotalFunding = {
        ...whereConditions.estimatedTotalFunding,
        gte: BigInt(filters.minFunding),
      };
    }
    
    if (filters.maxFunding) {
      whereConditions.estimatedTotalFunding = {
        ...whereConditions.estimatedTotalFunding,
        lte: BigInt(filters.maxFunding),
      };
    }
    
    if (filters.minDeadline) {
      whereConditions.deadline = {
        ...whereConditions.deadline,
        gte: new Date(filters.minDeadline),
      };
    }
    
    if (filters.maxDeadline) {
      whereConditions.deadline = {
        ...whereConditions.deadline,
        lte: new Date(filters.maxDeadline),
      };
    }
    
    if (filters.source && filters.source !== 'ALL') {
      whereConditions.source = filters.source;
    }

    return db.grant.findMany({
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      orderBy: {
        createdAt: 'desc',
      },
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
  }

  async findById(id: string): Promise<any | null> {
    return db.grant.findUnique({
      where: { id },
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
  }
} 