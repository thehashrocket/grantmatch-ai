import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prisma } from '@/prisma/generated/client';

type GrantWithDetails = Prisma.GrantGetPayload<{
	include: { details: true; attachments: true };
}>;

export function FundingSummaryCard({ grant }: { grant: GrantWithDetails }) {
	const rows: Array<[string, string | null | undefined | number | bigint]> = [
		['Award Ceiling', grant.awardCeiling],
		['Award Floor', grant.awardFloor],
		['Estimated Total Funding', grant.estimatedTotalFunding],
		['Estimated Award Amounts', grant.estimatedAwardAmounts],
		['Match Funding', grant.matchFunding],
		['Funds Disbursement', grant.fundsDisbursment],
	];

	const currencyLabels = new Set([
		'Award Ceiling',
		'Award Floor',
		'Estimated Total Funding',
	]);

	const formattedRows = rows
		.map(([label, value]) => {
			if (value === null || value === undefined || value === '') return null;
			const formatCurrency = (num: number) =>
				num.toLocaleString(undefined, {
					style: 'currency',
					currency: 'USD',
					maximumFractionDigits: 0,
				});

			if (currencyLabels.has(label)) {
				if (typeof value === 'number')
					return [label, formatCurrency(value)] as const;
				if (typeof value === 'bigint')
					return [label, formatCurrency(Number(value))] as const;
				const parsed = Number(value);
				if (Number.isFinite(parsed))
					return [label, formatCurrency(parsed)] as const;
			}

			if (typeof value === 'bigint') {
				return [label, value.toString()] as const;
			}
			if (typeof value === 'number') {
				return [label, value.toLocaleString()] as const;
			}
			return [label, String(value)] as const;
		})
		.filter((row): row is readonly [string, string] => !!row);

	if (!formattedRows.length) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Funding Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-3">
				{formattedRows.map(([label, display]) => (
					<div key={label}>
						<h3 className="font-medium">{label}</h3>
						<p className="text-sm text-muted-foreground">{display}</p>
					</div>
				))}
			</CardContent>
		</Card>
	);
}
