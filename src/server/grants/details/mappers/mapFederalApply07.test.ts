import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';

import { $Enums } from '../../../../prisma/generated/client';
import type { GrantWithRelations } from '../types';
import { mapFederalApply07, type FederalDetails } from './mapFederalApply07';

function buildGrant(
	overrides: Partial<GrantWithRelations> = {},
): GrantWithRelations {
	const now = new Date('2024-01-01T00:00:00Z');
	const base: GrantWithRelations = {
		id: 'grant-1',
		url: 'https://example.com',
		title: 'Base Grant',
		number: null,
		deadline: null,
		deadlineType: null,
		openDate: null,
		openDateType: null,
		stateAgency: null,
		matchFunding: null,
		estimatedTotalFunding: null,
		awardFloor: null,
		awardCeiling: null,
		estimatedAwardAmounts: null,
		fundsDisbursment: null,
		currentAsOf: null,
		grantor: 'Test Grantor',
		portalId: null,
		opportunityType: null,
		purpose: null,
		eligibleApplicants: null,
		eligibleGeographies: null,
		details: null,
		detailsStatus: $Enums.GrantDetailsStatus.UNKNOWN,
		detailsFetchedAt: null,
		detailsError: null,
		detailsErrorAt: null,
		source: $Enums.GrantSource.FEDERAL,
		agencyCode: null,
		cfdaList: null,
		sourceRecordId: 'source-1',
		sourceKey: null,
		contentHash: null,
		lastSeenAt: now,
		status: $Enums.GrantStatus.UNKNOWN,
		closedAt: null,
		attachments: [],
		createdAt: now,
		updatedAt: now,
	};

	return { ...base, ...overrides } as GrantWithRelations;
}

describe('mapFederalApply07', () => {
	const fixedNow = new Date('2024-05-01T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('handles missing fields without throwing', () => {
		const grant = buildGrant();
		const result = mapFederalApply07({}, grant);

		expect(result.detail.title).toBe(grant.title);
		expect(result.detail.description).toBeNull();
		expect(result.attachments).toHaveLength(0);
		expect(result.grantPatch?.status).toBe($Enums.GrantStatus.UNKNOWN);
	});

	it('maps synopsis HTML and applicant eligibility description', () => {
		const grant = buildGrant();
		const details: FederalDetails = {
			synopsis: {
				synopsisDesc: '<p>Synopsis body</p>',
				applicantEligibilityDesc: 'Eligible orgs only',
			},
		};

		const result = mapFederalApply07(details, grant);

		expect(result.detail.synopsisHtml).toBe('<p>Synopsis body</p>');
		expect(result.detail.applicantEligibilityDesc).toBe('Eligible orgs only');
		expect(result.detail.fetchedAt).toEqual(fixedNow);
	});

	it('extracts attachments safely', () => {
		const grant = buildGrant();
		const details: FederalDetails = {
			synopsis: {
				synopsisAttachmentFolders: [
					{
						synopsisAttachments: [
							{
								id: 123,
								fileName: 'file-one.pdf',
								mimeType: 'application/pdf',
								fileDescription: 'Attachment description',
								fileLobSize: '2048',
							},
						],
					},
				],
			},
		};

		const result = mapFederalApply07(details, grant);
		expect(result.attachments).toHaveLength(1);
		expect(result.attachments[0]).toMatchObject({
			upstreamId: '123',
			fileName: 'file-one.pdf',
			mimeType: 'application/pdf',
			description: 'Attachment description',
			sizeBytes: 2048,
		});
	});

	it('computes grant patch status and closedAt', () => {
		const grant = buildGrant();
		const details: FederalDetails = {
			synopsis: {
				oppStatus: 'closed',
				closeDate: '01/01/2025',
				fundingDescLinkUrl: 'https://example.com/desc',
			},
		};

		const result = mapFederalApply07(details, grant);

		expect(result.grantPatch?.status).toBe($Enums.GrantStatus.CLOSED);
		expect(result.grantPatch?.closedAt).toEqual(new Date('2025-01-01'));
		expect(result.grantPatch?.url).toBe('https://example.com/desc');
		expect(result.grantPatch?.lastSeenAt).toEqual(fixedNow);
	});
});
