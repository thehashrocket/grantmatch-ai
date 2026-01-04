// /src/server/grants/ingest/types.ts

import type { $Enums } from '@/prisma/generated/client';

export type NormalizedGrantDetail = {
	title?: string;
	purpose?: string;
	description?: string;
	eligibilityRequirements?: unknown;
	fundingDetails?: unknown;
	fetchedAt?: Date;
};

export type NormalizedGrantInput = {
	source: $Enums.GrantSource;
	sourceRecordId?: string;
	sourceKey?: string;
	number?: string;
	url: string;
	title: string;
	grantor: string;
	stateAgency?: string;
	purpose?: string;
	description?: string;
	eligibleApplicants?: string[];
	eligibleGeographies?: string;
	openDate?: Date;
	deadline?: Date;
	opportunityType?: string;
	currentAsOf?: Date;
	portalId?: number | null;
	matchFunding?: string;
	estimatedTotalFunding?: bigint | number | null;
	awardFloor?: bigint | number | null;
	awardCeiling?: bigint | number | null;
	estimatedAwardAmounts?: string;
	fundsDisbursment?: string;
	agencyCode?: string;
	cfdaList?: string[];
	status: $Enums.GrantStatus;
	closedAt?: Date | null;
	contentHash: string;
	lastSeenAt: Date;
	details?: NormalizedGrantDetail;
};

export type RunCounters = {
	recordsFetched: number;
	createdCount: number;
	updatedCount: number;
	unchangedCount: number;
	closedCount: number;
	reopenedCount: number;
};

export type UpsertResult = {
	created?: boolean;
	updated?: boolean;
	unchanged?: boolean;
	closed?: boolean;
	reopened?: boolean;
};

export type GrantSourcePage = {
	records: Record<string, unknown>[];
	nextCursor?: unknown;
	done?: boolean;
};

export interface GrantSourceAdapter {
	source: $Enums.GrantSource;
	name: string;
	getSchema?(): Promise<unknown>;
	getPage(cursor?: unknown): Promise<GrantSourcePage>;
	getRecords(): AsyncGenerator<Record<string, unknown>>;
	mapRecord(record: Record<string, unknown>): NormalizedGrantInput | null;
}
