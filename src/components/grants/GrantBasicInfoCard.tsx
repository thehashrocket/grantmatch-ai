import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Prisma } from '@/prisma/generated/client';

type GrantWithDetails = Prisma.GrantGetPayload<{
	include: { details: true; attachments: true };
}>;

export function GrantBasicInfoCard({ grant }: { grant: GrantWithDetails }) {
	const cfdaList =
		Array.isArray(grant.cfdaList) && grant.cfdaList.length
			? grant.cfdaList
					.map((item) => (typeof item === 'string' ? item : String(item)))
					.filter(Boolean)
					.join(', ')
			: undefined;

	const info: Array<[string, string | null | undefined]> =
		grant.source === 'FEDERAL'
			? [
					['Grantor', grant.grantor],
					['Opportunity Number', grant.number],
					['Agency Code', grant.agencyCode],
					['CFDA List', cfdaList],
				]
			: [
					['Purpose', grant.purpose],
					['State Agency', grant.stateAgency],
					['Grantor', grant.grantor],
					['Opportunity Type', grant.opportunityType],
				];

	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0">
				<CardTitle>Basic Information</CardTitle>
				<Badge variant="secondary" className="uppercase">
					{grant.source}
				</Badge>
			</CardHeader>
			<CardContent className="space-y-3">
				{info
					.filter(([, value]) => value && String(value).trim() !== '')
					.map(([label, value]) => (
						<div key={label}>
							<h3 className="font-medium">{label}</h3>
							<p className="text-sm text-muted-foreground">{value}</p>
						</div>
					))}
				{info.every(([, value]) => !value) && (
					<p className="text-sm text-muted-foreground">No basic info provided.</p>
				)}
			</CardContent>
		</Card>
	);
}
