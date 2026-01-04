import { createHash } from 'node:crypto';

import { describe, expect, beforeEach, it, vi } from 'vitest';
import { grantImportService } from '@/lib/services/GrantImportService';
import {
	parseDateFlexible,
	parseFundingAmount,
	toSmartTitleCase,
} from '@/lib/utils';
import { $Enums } from '@/prisma/generated/client';

const dbMocks = vi.hoisted(() => ({
	grantFindUniqueMock: vi.fn(),
	grantUpdateMock: vi.fn(),
	grantCreateMock: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
	db: {
		grant: {
			findUnique: dbMocks.grantFindUniqueMock,
			update: dbMocks.grantUpdateMock,
			create: dbMocks.grantCreateMock,
		},
	},
}));

const baseCaliforniaInput = {
	url: 'https://example.com/grant',
	title: 'Sample Grant',
	deadline: '2024-12-31',
	openDate: '2024-01-01',
	stateAgency: 'Agency',
	matchFunding: 'None',
	estimatedTotalFunding: '10000',
	estimatedAwardAmounts: '100-200',
	fundsDisbursement: 'cash',
	currentAsOf: '2024-02-02',
	grantor: 'Grantor',
	portalId: '123',
	opportunityType: 'Type',
	purpose: 'Helping communities thrive',
	eligibleApplicants: ['Nonprofit'],
	eligibleGeographies: 'CA',
	rawStatus: 'OPEN',
};

function computeCaliforniaContentHash(
	input: typeof baseCaliforniaInput,
): string {
	const deadlineDate = parseDateFlexible(input.deadline);
	const openDateDate = parseDateFlexible(input.openDate);
	const payload = {
		source: $Enums.GrantSource.CALIFORNIA,
		url: input.url,
		title: toSmartTitleCase(input.title),
		deadline: deadlineDate?.toISOString() ?? null,
		openDate: openDateDate?.toISOString() ?? null,
		grantor: input.grantor,
		purpose: input.purpose,
		matchFunding: input.matchFunding,
		estimatedTotalFunding: BigInt(
			parseFundingAmount(input.estimatedTotalFunding),
		).toString(),
		estimatedAwardAmounts: input.estimatedAwardAmounts,
		eligibleApplicants: input.eligibleApplicants.join(', '),
		eligibleGeographies: input.eligibleGeographies,
	};

	return createHash('sha256')
		.update(JSON.stringify(payload, Object.keys(payload).sort()))
		.digest('hex');
}

describe('GrantImportService no-op handling', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('skips full update when contentHash is unchanged', async () => {
		const contentHash = computeCaliforniaContentHash(baseCaliforniaInput);
		const existingLastSeen = new Date(Date.now() - 1000 * 60 * 60 * 48); // 2 days ago
		dbMocks.grantFindUniqueMock.mockResolvedValueOnce({
			id: 'grant-1',
			contentHash,
			lastSeenAt: existingLastSeen,
			currentAsOf: new Date('2024-01-01'),
			fitScoreVersion: 1,
		});

		const result =
			await grantImportService.upsertCaliforniaGrant(baseCaliforniaInput);

		expect(result.didWrite).toBe(false);
		expect(dbMocks.grantCreateMock).not.toHaveBeenCalled();
		expect(dbMocks.grantUpdateMock).toHaveBeenCalledTimes(1);
		const updateArg = dbMocks.grantUpdateMock.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		const updateData = updateArg?.data;
		expect(updateData).toHaveProperty('lastSeenAt');
		expect(updateData).not.toHaveProperty('fitScoreComputedAt');
		expect(updateData).not.toHaveProperty('fitScore');
		expect(updateData).not.toHaveProperty('contentHash');
	});

	it('performs full update when contentHash changes', async () => {
		dbMocks.grantFindUniqueMock.mockResolvedValueOnce({
			id: 'grant-2',
			contentHash: 'stale-hash',
			lastSeenAt: new Date(),
			currentAsOf: null,
			fitScoreVersion: 1,
		});

		const result =
			await grantImportService.upsertCaliforniaGrant(baseCaliforniaInput);

		expect(result.didWrite).toBe(true);
		expect(dbMocks.grantCreateMock).not.toHaveBeenCalled();
		expect(dbMocks.grantUpdateMock).toHaveBeenCalledTimes(1);
		const updateArg = dbMocks.grantUpdateMock.mock.calls[0]?.[0] as {
			data: Record<string, unknown>;
		};
		const data = updateArg?.data;
		expect(data).toHaveProperty('fitScoreComputedAt');
		expect(data).toHaveProperty('contentHash');
	});
});
