// src/lib/repositories/GrantRepository.ts

import { db } from '@/lib/db';
import type { GrantSearchFilters } from '@/lib/types/grant';
import type { Prisma } from '@/prisma/generated/client';
import type { $Enums } from '@/prisma/generated/client';

const grantSelect = {
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
	detailsStatus: true,
	detailsFetchedAt: true,
} satisfies Prisma.GrantSelect;

export type GrantRecord = Prisma.GrantGetPayload<{
	select: typeof grantSelect;
}>;

export interface GrantRepository {
	findWithFilters(filters: GrantSearchFilters): Promise<GrantRecord[]>;
	findWithFiltersPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<{ grants: GrantRecord[]; total: number }>;
	findById(id: string): Promise<GrantRecord | null>;
}

export class PrismaGrantRepository implements GrantRepository {
	async findWithFilters(filters: GrantSearchFilters): Promise<GrantRecord[]> {
		const whereConditions = this.buildWhereConditions(filters);
		const whereClause =
			Object.keys(whereConditions).length > 0 ? whereConditions : undefined;

		return db.grant.findMany({
			where: whereClause,
			orderBy: {
				createdAt: 'desc',
			},
			select: grantSelect,
		});
	}

	async findWithFiltersPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<{ grants: GrantRecord[]; total: number }> {
		const whereConditions = this.buildWhereConditions(filters);
		const whereClause =
			Object.keys(whereConditions).length > 0 ? whereConditions : undefined;
		const skip = (page - 1) * pageSize;

		const [grants, total] = await Promise.all([
			db.grant.findMany({
				where: whereClause,
				orderBy: {
					createdAt: 'desc',
				},
				select: grantSelect,
				skip,
				take: pageSize,
			}),
			db.grant.count({
				where: whereClause,
			}),
		]);

		return { grants, total };
	}

	async findById(id: string): Promise<GrantRecord | null> {
		return db.grant.findUnique({
			where: { id },
			select: grantSelect,
		});
	}

	private buildWhereConditions(
		filters: GrantSearchFilters,
	): Prisma.GrantWhereInput {
		const whereConditions: Prisma.GrantWhereInput = {};

		if (filters.textSearch) {
			whereConditions.OR = [
				{ title: { contains: filters.textSearch, mode: 'insensitive' } },
				{ purpose: { contains: filters.textSearch, mode: 'insensitive' } },
			];
		}

		if (filters.minFunding || filters.maxFunding) {
			whereConditions.estimatedTotalFunding = {
				...(filters.minFunding ? { gte: BigInt(filters.minFunding) } : {}),
				...(filters.maxFunding ? { lte: BigInt(filters.maxFunding) } : {}),
			} as Prisma.GrantWhereInput['estimatedTotalFunding'];
		}

		if (filters.minDeadline) {
			const minDeadline = new Date(filters.minDeadline);
			minDeadline.setHours(0, 0, 0, 0);

			const deadlineFilter: Prisma.GrantWhereInput['deadline'] = {
				gte: minDeadline,
			};

			if (filters.maxDeadline) {
				const maxDeadline = new Date(filters.maxDeadline);
				maxDeadline.setHours(23, 59, 59, 999);
				deadlineFilter.lte = maxDeadline;
			}

			whereConditions.deadline = deadlineFilter;
		} else {
			const today = new Date();
			today.setHours(0, 0, 0, 0);

			const defaultDeadlineConditions: Prisma.GrantWhereInput[] = [
				{ deadline: { gte: today } },
				{ deadline: null },
			];

			if (filters.maxDeadline) {
				const maxDeadline = new Date(filters.maxDeadline);
				maxDeadline.setHours(23, 59, 59, 999);
				defaultDeadlineConditions[0] = {
					deadline: {
						gte: today,
						lte: maxDeadline,
					},
				};
			}

			if (whereConditions.OR) {
				whereConditions.AND = [
					{ OR: whereConditions.OR },
					{ OR: defaultDeadlineConditions },
				];
				delete whereConditions.OR;
			} else {
				whereConditions.OR = defaultDeadlineConditions;
			}
		}

		if (filters.source && filters.source !== 'ALL') {
			whereConditions.source = filters.source as $Enums.GrantSource;
		}

		return whereConditions;
	}
}
