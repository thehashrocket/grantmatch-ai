// src/lib/repositories/GrantRepository.ts

import { db } from '@/lib/db';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';
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
	awardFloor: true,
	awardCeiling: true,
	estimatedAwardAmounts: true,
	fundsDisbursment: true,
	currentAsOf: true,
	grantor: true,
	portalId: true,
	opportunityType: true,
	purpose: true,
	eligibleApplicants: true,
	eligibleGeographies: true,
	fitScore: true,
	fitScoreVersion: true,
	fitScoreComputedAt: true,
	createdAt: true,
	updatedAt: true,
	source: true,
	status: true,
	closedAt: true,
	detailsStatus: true,
	detailsFetchedAt: true,
} satisfies Prisma.GrantSelect;

export type GrantRecord = Prisma.GrantGetPayload<{
	select: typeof grantSelect;
}>;

export type GrantMatchRecord = {
	fitScore: number;
	subscoresJson: Prisma.JsonValue | null;
	explanation: string | null;
	grant: GrantRecord;
};

export interface GrantRepository {
	findWithFilters(filters: GrantSearchFilters): Promise<GrantRecord[]>;
	findWithFiltersPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<{ grants: GrantRecord[]; total: number }>;
	findWithFiltersPaginatedForOrg(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
		organizationId: string,
	): Promise<{ matches: GrantMatchRecord[]; total: number }>;
	findById(id: string): Promise<GrantRecord | null>;
}

export class PrismaGrantRepository implements GrantRepository {
	async findWithFilters(filters: GrantSearchFilters): Promise<GrantRecord[]> {
		const { grantWhere } = this.buildWhereConditions(filters);
		const whereClause =
			Object.keys(grantWhere).length > 0 ? grantWhere : undefined;

		return db.grant.findMany({
			where: whereClause,
			orderBy: this.buildOrderBy(filters.sort),
			select: grantSelect,
		});
	}

	async findWithFiltersPaginated(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
	): Promise<{ grants: GrantRecord[]; total: number }> {
		const { grantWhere } = this.buildWhereConditions(filters);
		const whereClause =
			Object.keys(grantWhere).length > 0 ? grantWhere : undefined;
		const skip = (page - 1) * pageSize;

		const [grants, total] = await Promise.all([
			db.grant.findMany({
				where: whereClause,
				orderBy: this.buildOrderBy(filters.sort),
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

	async findWithFiltersPaginatedForOrg(
		filters: GrantSearchFilters,
		page: number,
		pageSize: number,
		organizationId: string,
	): Promise<{ matches: GrantMatchRecord[]; total: number }> {
		const { grantWhere, matchFitScoreWhere } = this.buildWhereConditions(
			filters,
			{ includeFitScore: false },
		);
		const skip = (page - 1) * pageSize;
		const ensureTake = Math.min(pageSize * 2, 200);

		// Precompute matches for the slice of grants we’re about to read to keep pagination stable.
		const candidateGrantIds = await db.grant.findMany({
			where: grantWhere,
			orderBy: this.buildOrderBy(filters.sort),
			select: { id: true },
			skip,
			take: ensureTake,
		});

		if (candidateGrantIds.length > 0) {
			const grantIds = candidateGrantIds.map((grant) => grant.id);
			await ensureGrantMatches({
				prisma: db,
				organizationId,
				grantIds,
			});
		}

		const matchWhere: Prisma.GrantMatchWhereInput = {
			organizationId,
			...(matchFitScoreWhere ? { fitScore: matchFitScoreWhere } : {}),
			grant: grantWhere,
		};

		const [matches, total] = await Promise.all([
			db.grantMatch.findMany({
				where: matchWhere,
				orderBy: this.buildMatchOrderBy(filters.sort),
				select: {
					fitScore: true,
					subscoresJson: true,
					explanation: true,
					grant: { select: grantSelect },
				},
				skip,
				take: pageSize,
			}),
			db.grantMatch.count({ where: matchWhere }),
		]);

		return { matches, total };
	}

	async findById(id: string): Promise<GrantRecord | null> {
		return db.grant.findUnique({
			where: { id },
			select: grantSelect,
		});
	}

	private buildWhereConditions(
		filters: GrantSearchFilters,
		options: { includeFitScore?: boolean } = {},
	): {
		grantWhere: Prisma.GrantWhereInput;
		matchFitScoreWhere?: Prisma.FloatFilter;
	} {
		const includeFitScore = options.includeFitScore ?? true;
		const whereConditions: Prisma.GrantWhereInput = {};
		let matchFitScoreWhere: Prisma.FloatFilter | undefined;

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

		const deadlineWithinDays =
			filters.deadlineWithinDays && filters.deadlineWithinDays !== ''
				? Number(filters.deadlineWithinDays)
				: null;

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
		} else if (deadlineWithinDays && !Number.isNaN(deadlineWithinDays)) {
			const start = new Date();
			start.setHours(0, 0, 0, 0);
			const end = new Date(start);
			end.setDate(start.getDate() + deadlineWithinDays);
			end.setHours(23, 59, 59, 999);

			whereConditions.deadline = {
				gte: start,
				lte: end,
			};
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

		if (filters.minFitScore || filters.maxFitScore) {
			const fitScoreFilter: Prisma.FloatFilter = {};
			if (filters.minFitScore) {
				const minScore = parseFloat(filters.minFitScore);
				if (!Number.isNaN(minScore)) {
					fitScoreFilter.gte = minScore;
				}
			}

			if (filters.maxFitScore) {
				const maxScore = parseFloat(filters.maxFitScore);
				if (!Number.isNaN(maxScore)) {
					fitScoreFilter.lte = maxScore;
				}
			}

			if (Object.keys(fitScoreFilter).length > 0) {
				if (includeFitScore) {
					whereConditions.fitScore = fitScoreFilter;
				} else {
					matchFitScoreWhere = fitScoreFilter;
				}
			}
		}

		return { grantWhere: whereConditions, matchFitScoreWhere };
	}

	private buildOrderBy(
		sort: GrantSearchFilters['sort'],
	): Prisma.GrantOrderByWithRelationInput[] {
		const sortOption = sort ?? 'FIT_DESC';
		const fitScoreOrder: Prisma.SortOrderInput = {
			sort: 'desc',
			nulls: 'last',
		};
		switch (sortOption) {
			case 'DEADLINE_ASC':
				return [
					{ deadline: { sort: 'asc', nulls: 'last' } },
					{ fitScore: fitScoreOrder },
					{ createdAt: 'desc' },
				];
			case 'DEADLINE_DESC':
				return [
					{ deadline: { sort: 'desc', nulls: 'last' } },
					{ fitScore: fitScoreOrder },
					{ createdAt: 'desc' },
				];
			case 'NEWEST':
				return [
					{ createdAt: 'desc' },
					{ fitScore: fitScoreOrder },
					{ id: 'desc' },
				];
			default:
				return [
					{ fitScore: fitScoreOrder },
					{ createdAt: 'desc' },
					{ id: 'desc' },
				];
		}
	}

	private buildMatchOrderBy(
		sort: GrantSearchFilters['sort'],
	): Prisma.GrantMatchOrderByWithRelationInput[] {
		const fitScoreOrder = 'desc' as const;
		const sortOption = sort ?? 'FIT_DESC';
		switch (sortOption) {
			case 'DEADLINE_ASC':
				return [
					{ grant: { deadline: { sort: 'asc', nulls: 'last' } } },
					{ fitScore: fitScoreOrder },
					{ grantId: 'desc' },
				];
			case 'DEADLINE_DESC':
				return [
					{ grant: { deadline: { sort: 'desc', nulls: 'last' } } },
					{ fitScore: fitScoreOrder },
					{ grantId: 'desc' },
				];
			case 'NEWEST':
				return [
					{ grant: { createdAt: 'desc' } },
					{ fitScore: fitScoreOrder },
					{ grantId: 'desc' },
				];
			default:
				return [{ fitScore: fitScoreOrder }, { grantId: 'desc' }];
		}
	}
}
