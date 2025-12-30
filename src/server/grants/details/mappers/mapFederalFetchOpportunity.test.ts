import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { $Enums } from '@/prisma/generated/client';
import type { GrantWithRelations } from '@/server/grants/details/types';
import {
	mapFederalFetchOpportunity,
	type FederalFetchOpportunityResponse,
} from '@/server/grants/details/mappers/mapFederalFetchOpportunity';

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
		sourceRecordId: '289999',
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

const sampleResponse: FederalFetchOpportunityResponse = {
	errorcode: 0,
	msg: 'Webservice Succeeds',
	token: 'token',
	data: {
		id: 289999,
		revision: 0,
		opportunityNumber: 'TEST-PTS-20231011-OPP1',
		opportunityTitle: 'Test-PTS-20231011-Opp1 title!',
		owningAgencyCode: 'HHS',
		listed: 'L',
		publisherUid: 'RatjJoeApplicant',
		flag2006: 'N',
		opportunityCategory: { category: 'E', description: 'Earmark' },
		synopsis: {
			opportunityId: 289999,
			version: 1,
			agencyCode: 'HHS',
			agencyName: 'Health & Human Services',
			agencyPhone: 'TBD-',
			agencyAddressDesc: '12',
			agencyDetails: {
				code: 'HHS',
				seed: 'HHS',
				agencyName: 'HHS Agency',
				agencyCode: 'HSS',
				topAgencyCode: 'HSS',
			},
			topAgencyDetails: {
				code: 'HHS',
				seed: 'HHS',
				agencyName: 'HHS Agency',
				agencyCode: 'HHS',
				topAgencyCode: 'HHS',
			},
			agencyContactPhone: 'TBD-',
			agencyContactName: 'Alison Applegate',
			agencyContactDesc: 'Phone TBD-',
			agencyContactEmail: '12@hhs.gov',
			agencyContactEmailDesc: '12',
			synopsisDesc: '\nDesc\n\n',
			responseDateDesc: '1',
			postingDate: 'Oct 11, 2023 12:00:00 AM EDT',
			costSharing: false,
			awardCeiling: '10',
			awardCeilingFormatted: '10',
			awardFloor: '8',
			awardFloorFormatted: '8',
			sendEmail: 'Y',
			createTimeStamp: 'Oct 11, 2023 05:18:23 PM EDT',
			createdDate: 'Oct 11, 2023 05:17:55 PM EDT',
			lastUpdatedDate: 'Oct 11, 2023 05:17:55 PM EDT',
			applicantTypes: [{ id: '01', description: 'County governments' }],
			fundingInstruments: [{ id: 'G', description: 'Grant' }],
			fundingActivityCategories: [{ id: 'AR', description: 'Arts' }],
			postingDateStr: '2023-10-11-00-00-00',
			createTimeStampStr: '2023-10-11-17-18-23',
			synopsisAttachmentFolders: [
				{
					id: 1684,
					opportunityId: 289999,
					folderType: 'Full Announcement',
					folderName: 'F1',
					zipLobSize: 180032,
					createdDate: 'Oct 11, 2023 05:18:05 PM EDT',
					lastUpdatedDate: 'Oct 11, 2023 05:18:23 PM EDT',
					synopsisAttachments: [
						{
							id: 10190,
							opportunityId: 289999,
							mimeType: 'text/csv',
							fileName: 'grants-gov-opp-search--20230715011557.csv',
							fileDescription: 'F1',
							fileLobSize: 1320700,
							synopsisAttFolderId: 1684,
						},
					],
				},
			],
			synopsisDocumentURLs: [],
			synAttChangeComments: [],
		},
		agencyDetails: {
			code: 'HHS',
			seed: 'HHS',
			agencyName: 'Health & Human Services',
			agencyCode: 'HHS',
			topAgencyCode: 'HHS',
		},
		topAgencyDetails: {
			code: 'HHS',
			seed: 'HHS',
			agencyName: 'Health & Human Services',
			agencyCode: 'HHS',
			topAgencyCode: 'HHS',
		},
		synopsisAttachmentFolders: [],
		synopsisDocumentURLs: [],
		synAttChangeComments: [],
		alns: [
			{
				id: 335392,
				opportunityId: 289999,
				alnNumber: '93.223',
				programTitle: 'Development and Coordination of Rural Health Services',
			},
		],
		opportunityHistoryDetails: [],
		opportunityPkgs: [],
		closedOpportunityPkgs: [],
		originalDueDateDesc: '1',
		synopsisModifiedFields: [],
		forecastModifiedFields: [],
		errorMessages: [],
		synPostDateInPast: true,
		docType: 'synopsis',
		forecastHistCount: 0,
		synopsisHistCount: 0,
		assistCompatible: false,
		assistURL: '',
		relatedOpps: [],
		draftMode: 'N',
	},
};

describe('mapFederalFetchOpportunity', () => {
	const fixedNow = new Date('2024-05-01T12:00:00Z');

	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(fixedNow);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('maps fetchOpportunity payload into Grant and GrantDetail fields', () => {
		const grant = buildGrant({ number: null });
		const result = mapFederalFetchOpportunity(sampleResponse, grant);

		expect(result.detail.title).toBe('Test-PTS-20231011-Opp1 title!');
		expect(result.detail.purpose).toBe('Earmark');
		expect(result.detail.description?.trim()).toBe('Desc');
		expect(result.detail.applicantEligibilityDesc).toBeNull();
		expect(result.detail.eligibilityRequirements).toEqual({
			applicantTypes: [{ id: '01', description: 'County governments' }],
			applicantEligibilityDesc: null,
		});
		expect(result.detail.fundingDetails).toMatchObject({
			awardCeiling: '10',
			awardFloor: '8',
			costSharing: false,
			alns: sampleResponse.data?.alns,
		});
		expect(result.attachments).toHaveLength(1);
		expect(result.attachments[0]).toMatchObject({
			upstreamId: '10190',
			fileName: 'grants-gov-opp-search--20230715011557.csv',
			mimeType: 'text/csv',
			sizeBytes: 1320700,
		});

		const patch = result.grantPatch ?? {};
		expect(patch.number).toBe('TEST-PTS-20231011-OPP1');
		expect(patch.agencyCode).toBe('HHS');
		expect(patch.awardCeiling).toBe(BigInt(10));
		expect(patch.awardFloor).toBe(BigInt(8));
		expect(patch.cfdaList).toEqual(['93.223']);
		expect(patch.grantor).toBe('Health & Human Services');
		expect(patch.lastSeenAt).toEqual(fixedNow);

		const openDate = patch.openDate as Date | null | undefined;
		expect(openDate?.getUTCFullYear()).toBe(2023);
		expect(openDate?.getUTCMonth()).toBe(9);
	});
});
