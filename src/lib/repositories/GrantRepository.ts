import { db } from '@/lib/db';
import { type GrantSearchFilters } from '@/components/grants/GrantSearchForm';

export interface GrantRepository {
  findWithFilters(filters: GrantSearchFilters): Promise<any[]>;
  findWithFiltersPaginated(filters: GrantSearchFilters, page: number, pageSize: number): Promise<{ grants: any[], total: number }>;
  findById(id: string): Promise<any | null>;
}

export class PrismaGrantRepository implements GrantRepository {
  async findWithFilters(filters: GrantSearchFilters): Promise<any[]> {
    const whereConditions = this.buildWhereConditions(filters);

    return db.grant.findMany({
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      orderBy: {
        createdAt: 'desc',
      },
      select: this.getGrantSelect(),
    });
  }

  async findWithFiltersPaginated(filters: GrantSearchFilters, page: number, pageSize: number): Promise<{ grants: any[], total: number }> {
    const whereConditions = this.buildWhereConditions(filters);
    const skip = (page - 1) * pageSize;

    const [grants, total] = await Promise.all([
      db.grant.findMany({
        where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
        orderBy: {
          createdAt: 'desc',
        },
        select: this.getGrantSelect(),
        skip,
        take: pageSize,
      }),
      db.grant.count({
        where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      }),
    ]);

    return { grants, total };
  }

  async findById(id: string): Promise<any | null> {
    return db.grant.findUnique({
      where: { id },
      select: this.getGrantSelect(),
    });
  }

  private buildWhereConditions(filters: GrantSearchFilters): any {
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
    
    // Handle deadline filtering
    // If user specifies minDeadline, use it; otherwise default to today
    if (filters.minDeadline) {
      const minDeadline = new Date(filters.minDeadline);
      minDeadline.setHours(0, 0, 0, 0);
      whereConditions.deadline = {
        ...whereConditions.deadline,
        gte: minDeadline,
      };
    } else {
      // Default behavior: only show grants with deadlines today or later, OR grants with null deadlines (ongoing/rolling)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Create deadline conditions
      const deadlineConditions = [
        { deadline: { gte: today } },
        { deadline: null }
      ];
      
      // If we already have OR conditions (from text search), we need to combine them
      if (whereConditions.OR) {
        // Create AND conditions: (text search OR purpose search) AND (deadline conditions)
        whereConditions.AND = [
          { OR: whereConditions.OR },
          { OR: deadlineConditions }
        ];
        delete whereConditions.OR;
      } else {
        whereConditions.OR = deadlineConditions;
      }
    }
    
    if (filters.maxDeadline) {
      const maxDeadline = new Date(filters.maxDeadline);
      maxDeadline.setHours(23, 59, 59, 999);
      
      if (whereConditions.AND) {
        // If we have AND conditions, apply maxDeadline to the deadline OR condition
        const deadlineOrCondition = whereConditions.AND.find((condition: any) => condition.OR && condition.OR.some((c: any) => c.deadline));
        if (deadlineOrCondition) {
          const deadlineCondition = deadlineOrCondition.OR.find((c: any) => c.deadline && c.deadline.gte);
          if (deadlineCondition) {
            deadlineCondition.deadline.lte = maxDeadline;
          }
        }
      } else if (whereConditions.OR) {
        // If we have OR conditions, we need to apply maxDeadline to the first condition only
        whereConditions.OR[0] = {
          ...whereConditions.OR[0],
          deadline: {
            ...whereConditions.OR[0].deadline,
            lte: maxDeadline,
          }
        };
      } else {
        whereConditions.deadline = {
          ...whereConditions.deadline,
          lte: maxDeadline,
        };
      }
    }
    
    if (filters.source && filters.source !== 'ALL') {
      whereConditions.source = filters.source;
    }

    return whereConditions;
  }

  private getGrantSelect() {
    return {
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
      source: true,
    };
  }
} 