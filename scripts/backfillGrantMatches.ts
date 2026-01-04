#!/usr/bin/env tsx

/**
 * Backfill per-organization GrantMatch rows.
 *
 * Usage: pnpm tsx scripts/backfillGrantMatches.ts
 */

import { prisma } from '@/lib/prisma';
import { ensureGrantMatches } from '@/server/grants/match/upsertGrantMatch';

const ORG_BATCH = 50;
const GRANT_BATCH = 500;

async function main() {
	console.log('Starting GrantMatch backfill...');

	const totalOrgs = await prisma.organization.count();
	let processedOrgs = 0;

	for await (const organizations of paginateOrganizations()) {
		for (const org of organizations) {
			processedOrgs += 1;
			const totalGrants = await prisma.grant.count();
			let processedGrants = 0;

			for await (const grantIds of paginateGrantIds(GRANT_BATCH)) {
				await ensureGrantMatches({
					prisma,
					organizationId: org.id,
					grantIds,
				});
				processedGrants += grantIds.length;
				logProgress(
					org.id,
					processedGrants,
					totalGrants,
					processedOrgs,
					totalOrgs,
				);
			}
		}
	}

	console.log('GrantMatch backfill complete.');
	await prisma.$disconnect();
}

async function* paginateOrganizations() {
	let skip = 0;
	while (true) {
		const orgs = await prisma.organization.findMany({
			skip,
			take: ORG_BATCH,
			select: { id: true },
			orderBy: { createdAt: 'asc' },
		});
		if (orgs.length === 0) break;
		yield orgs;
		skip += orgs.length;
	}
}

async function* paginateGrantIds(batchSize: number) {
	let skip = 0;
	while (true) {
		const grants = await prisma.grant.findMany({
			skip,
			take: batchSize,
			select: { id: true },
			orderBy: { createdAt: 'asc' },
		});
		if (grants.length === 0) break;
		yield grants.map((g) => g.id);
		skip += grants.length;
	}
}

function logProgress(
	orgId: string,
	processedGrants: number,
	totalGrants: number,
	processedOrgs: number,
	totalOrgs: number,
) {
	const pctGrants = totalGrants
		? ((processedGrants / totalGrants) * 100).toFixed(1)
		: '0.0';
	const pctOrgs = totalOrgs
		? ((processedOrgs / totalOrgs) * 100).toFixed(1)
		: '0.0';
	console.log(
		`Org ${orgId}: ${processedGrants}/${totalGrants} grants (${pctGrants}%) | Orgs ${processedOrgs}/${totalOrgs} (${pctOrgs}%)`,
	);
}

main().catch((error) => {
	console.error('Backfill failed', error);
	process.exit(1);
});
