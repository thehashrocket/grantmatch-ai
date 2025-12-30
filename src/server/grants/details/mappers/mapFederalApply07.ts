import { type Prisma, type Grant, $Enums } from '@/prisma/generated/client';
import {
	normalizeOppStatusToGrantStatus,
	parseFederalDateMMDDYYYY,
} from '@/server/grants/sources/federalClient';

export type FederalSynopsis = {
	opportunityId?: string | number;
	opportunityTitle?: string;
	agencyCode?: string;
	agencyName?: string;
	opportunityCategory?: { description?: string };
	synopsisDesc?: string;
	version?: string | number;
	applicantTypes?: unknown;
	applicantEligibilityDesc?: string;
	eligibilityDescription?: string;
	estimatedFunding?: unknown;
	estFunding?: unknown;
	numberOfAwards?: unknown;
	fundingActivityCategories?: unknown;
	fundingActivityCategory?: { description?: string };
	fundingInstruments?: unknown;
	fundingDescLinkUrl?: string;
	synopsisURL?: string;
	fundingDescLinkDesc?: string;
	synopsisAttachmentFolders?: unknown;
	responseDateDesc?: string;
	postingDate?: string;
	archiveDate?: string;
	lastUpdatedDate?: string;
	closeDate?: string;
	oppStatus?: string;
	[key: string]: unknown;
};

export type FederalDetails = {
	synopsis?: FederalSynopsis;
	opportunity?: FederalSynopsis;
	opportunityTitle?: string;
	applicantTypes?: unknown;
	applicantEligibilityDesc?: string;
	eligibilityDescription?: string;
	fundingActivityCategory?: { description?: string };
	fundingDescLinkUrl?: string;
	synopsisURL?: string;
};

type SynopsisAttachment = {
	id?: unknown;
	fileName?: unknown;
	mimeType?: unknown;
	fileDescription?: unknown;
	fileLobSize?: unknown;
	url?: unknown;
};

type SynopsisAttachmentFolder = {
	synopsisAttachments?: unknown;
};

function extractAttachments(
	raw: unknown,
): Omit<Prisma.GrantAttachmentCreateManyInput, 'grantId'>[] {
	if (!Array.isArray(raw)) return [];

	const attachments: Omit<Prisma.GrantAttachmentCreateManyInput, 'grantId'>[] =
		[];

	for (const folder of raw as SynopsisAttachmentFolder[]) {
		const folderAttachments = (folder?.synopsisAttachments ??
			[]) as SynopsisAttachment[];
		if (!Array.isArray(folderAttachments)) continue;

		for (const attachment of folderAttachments) {
			const fileName =
				typeof attachment?.fileName === 'string'
					? attachment.fileName
					: undefined;
			if (!fileName) continue;

			const rawSize = (attachment as SynopsisAttachment).fileLobSize;
			const parsedSize =
				typeof rawSize === 'number' ? rawSize : Number(rawSize);
			const sizeBytes = Number.isFinite(parsedSize)
				? Math.trunc(parsedSize)
				: undefined;

			attachments.push({
				upstreamId: attachment?.id != null ? String(attachment.id) : undefined,
				fileName,
				mimeType:
					typeof attachment?.mimeType === 'string'
						? attachment.mimeType
						: undefined,
				description:
					typeof attachment?.fileDescription === 'string'
						? attachment.fileDescription
						: undefined,
				sizeBytes,
				url: typeof attachment?.url === 'string' ? attachment.url : undefined,
			});
		}
	}

	return attachments;
}

export function mapFederalApply07(details: FederalDetails, grant: Grant) {
	const synopsis = details?.synopsis ?? details?.opportunity ?? {};
	const now = new Date();

	const title =
		synopsis.opportunityTitle ?? details?.opportunityTitle ?? grant.title;
	const purpose = synopsis.opportunityCategory?.description ?? null;
	const description = synopsis.synopsisDesc ?? null;

	const applicantEligibilityDesc =
		synopsis.applicantEligibilityDesc ??
		synopsis.eligibilityDescription ??
		details?.applicantEligibilityDesc ??
		details?.eligibilityDescription ??
		null;

	const eligibilityRequirements =
		synopsis.applicantTypes || applicantEligibilityDesc
			? ({
					applicantTypes:
						synopsis.applicantTypes ?? details?.applicantTypes ?? null,
					applicantEligibilityDesc: applicantEligibilityDesc ?? null,
				} as Prisma.InputJsonValue)
			: undefined;

	const fundingDescLinkUrl =
		synopsis.fundingDescLinkUrl ?? synopsis.synopsisURL ?? null;

	const fundingDetails: Record<string, unknown> = {
		estimatedFunding: synopsis.estimatedFunding ?? synopsis.estFunding ?? null,
		numberOfAwards: synopsis.numberOfAwards ?? null,
		fundingActivityCategories:
			synopsis.fundingActivityCategories ??
			synopsis.fundingActivityCategory?.description ??
			null,
		fundingInstruments: synopsis.fundingInstruments ?? null,
		fundingDescLinkUrl,
		fundingDescLinkDesc: synopsis.fundingDescLinkDesc ?? null,
		responseDateDesc: synopsis.responseDateDesc ?? null,
		postingDate: synopsis.postingDate ?? null,
		archiveDate: synopsis.archiveDate ?? null,
	};

	const currentAsOf = parseFederalDateMMDDYYYY(synopsis.lastUpdatedDate);
	const closeDate = parseFederalDateMMDDYYYY(synopsis.closeDate);
	const { status, closedAt } = normalizeOppStatusToGrantStatus(
		synopsis.oppStatus,
		closeDate,
		now,
	);

	const grantPatch: Partial<Prisma.GrantUncheckedUpdateInput> = {
		url: fundingDescLinkUrl ?? undefined,
		currentAsOf: currentAsOf ?? undefined,
		status: status as $Enums.GrantStatus,
		closedAt:
			status === $Enums.GrantStatus.CLOSED
				? (closedAt ?? closeDate ?? grant.closedAt ?? null)
				: null,
		lastSeenAt: now,
	};

	return {
		detail: {
			title,
			purpose,
			description,
			synopsisHtml: synopsis.synopsisDesc ?? null,
			applicantEligibilityDesc,
			fundingDescLinkUrl,
			responseDateDesc: synopsis.responseDateDesc ?? null,
			eligibilityRequirements,
			fundingDetails: fundingDetails as Prisma.InputJsonValue,
			rawJson: details as Prisma.InputJsonValue,
			fetchedAt: now,
		},
		attachments: extractAttachments(synopsis.synopsisAttachmentFolders),
		grantPatch,
		raw: details,
	};
}
