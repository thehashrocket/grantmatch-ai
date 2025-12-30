import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prisma } from '@/prisma/generated/client';

type FundingValue = Record<string, unknown> | null | undefined;

type GrantWithDetails = Prisma.GrantGetPayload<{
	include: { details: true; attachments: true };
}>;

const isObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const toNonEmptyString = (value: unknown): string | undefined => {
	if (typeof value !== 'string') return undefined;
	const trimmed = value.trim();
	return trimmed ? trimmed : undefined;
};

const stringify = (value: unknown): string | undefined => {
	if (value == null) return undefined;
	if (typeof value === 'string') return toNonEmptyString(value);
	return toNonEmptyString(String(value));
};

function normalizeFundingDetails(
	baseGrant: GrantWithDetails,
	funding: FundingValue,
): Record<string, string> | undefined {
	if (!isObject(funding)) return undefined;

	const entries: Array<[string, unknown]> = [
		['Estimated Total Funding', funding.estimatedFunding ?? funding.totalEstimatedFunding ?? baseGrant.estimatedTotalFunding],
		['Award Ceiling', funding.awardCeiling],
		['Award Floor', funding.awardFloor],
		['Number of Awards', funding.numberOfAwards ?? funding.expectedNumberOfAwards],
		['Estimated Amount Per Award', funding.estimatedAmountPerAward ?? funding.estimatedAwardAmounts],
		['Cost Sharing', funding.costSharing],
		['Funding Instruments', funding.fundingInstruments],
		['Funding Categories', funding.fundingActivityCategories],
		['Funding Method', funding.fundingMethod],
		['Funding Source', funding.fundingSource],
		['Funding Source Notes', funding.fundingSourceNotes],
		['Funding Desc Link', funding.fundingDescLinkUrl ?? funding.fundingDescLinkDesc],
		['Response Date Description', funding.responseDateDesc],
		['Original Due Date Description', funding.originalDueDateDesc],
		['Archive Date', funding.archiveDate],
		['Posting Date', funding.postingDate],
		['Letter of Intent Required', funding.letterOfIntentRequired],
		['Requires Matched Funding', funding.requiresMatchedFunding],
		['Assist URL', funding.assistURL],
		['Agency URL', funding.agencyUrl],
		['Application URL', funding.applicationUrl],
		['Grant Events URL', funding.grantEventsUrl],
		['Contact Info', funding.contactInfo],
		['Award Period', funding.awardPeriod],
		['Expected Award Date', funding.expectedAwardDate],
	];

	const normalized: Record<string, string> = {};
	for (const [label, raw] of entries) {
		if (raw === undefined || raw === null) continue;

		if (Array.isArray(raw)) {
			const list = raw
				.map((item) => {
					if (isObject(item)) {
						return toNonEmptyString(item.description ?? item.id);
					}
					return stringify(item);
				})
				.filter((val): val is string => !!val);
			if (list.length) {
				normalized[label] = list.join(', ');
			}
			continue;
		}

		const str = stringify(raw);
		if (str) normalized[label] = str;
	}

	return Object.keys(normalized).length ? normalized : undefined;
}

export function AdditionalFundingDetailsCard({
	grant,
}: {
	grant: GrantWithDetails;
}) {
	const details = useMemo(() => {
		const rawFunding =
			grant.details?.fundingDetails && typeof grant.details.fundingDetails === 'object'
				? (grant.details.fundingDetails as FundingValue)
				: undefined;
		return normalizeFundingDetails(grant, rawFunding);
	}, [grant]);

	if (!details) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Additional Funding Details</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{Object.entries(details).map(([label, value]) => (
						<div key={label}>
							<span className="font-medium">{label}: </span>
							<span className="text-sm text-muted-foreground">{value}</span>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
