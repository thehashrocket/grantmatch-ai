import { db } from '@/lib/db';
import type { GrantSource } from '@/prisma/generated/client';

const PAGE_SIZE = 24;

const openGrantsWhere = {
	deadlineType: { not: 'CLOSED' as const },
	status: { not: 'CLOSED' as const },
} as const;

export async function getPublicGrants({
	source,
	page = 1,
	limit = PAGE_SIZE,
}: {
	source?: GrantSource;
	page?: number;
	limit?: number;
}) {
	const where = {
		...openGrantsWhere,
		...(source ? { source } : {}),
	};

	const [grants, total] = await Promise.all([
		db.grant.findMany({
			where,
			select: {
				id: true,
				title: true,
				grantor: true,
				source: true,
				deadline: true,
				deadlineType: true,
				estimatedTotalFunding: true,
				awardFloor: true,
				awardCeiling: true,
				purpose: true,
				eligibleApplicants: true,
				updatedAt: true,
			},
			orderBy: { updatedAt: 'desc' },
			skip: (page - 1) * limit,
			take: limit,
		}),
		db.grant.count({ where }),
	]);

	return { grants, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getGrantById(id: string) {
	return db.grant.findUnique({
		where: { id },
		include: { details: true },
	});
}

export async function getIndexableGrantIds() {
	return db.grant.findMany({
		where: openGrantsWhere,
		select: { id: true, updatedAt: true },
		orderBy: { updatedAt: 'desc' },
		take: 50_000, // Google Sitemaps cap at 50,000 URLs per file
	});
}

export async function getGrantSources(): Promise<GrantSource[]> {
	const results = await db.grant.groupBy({
		by: ['source'],
		where: openGrantsWhere,
	});
	return results.map((r) => r.source);
}
