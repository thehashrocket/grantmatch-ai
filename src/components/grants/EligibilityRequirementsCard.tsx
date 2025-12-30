import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Prisma } from '@/prisma/generated/client';

type ApplicantType = { id?: string | null; description?: string | null };

type EligibilityValue = {
	eligibilityText?: string;
	applicantTypeNotes?: string;
	requirements?: string;
	eligibleApplicants?: unknown;
	eligibleGeographies?: unknown;
	applicantTypes?: unknown;
	applicantEligibilityDesc?: string;
};

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

const toApplicantTypeList = (value: unknown): string[] | undefined => {
	if (!Array.isArray(value)) return undefined;
	const descriptions = (value as ApplicantType[])
		.map((entry) => toNonEmptyString(entry?.description ?? entry?.id))
		.filter((val): val is string => !!val);
	return descriptions.length ? descriptions : undefined;
};

const normalizeApplicants = (
	value: unknown,
	fallback: string | null,
): string[] | undefined => {
	if (Array.isArray(value)) {
		const normalized = value
			.map((item) => toNonEmptyString(item))
			.filter((item): item is string => !!item);
		if (normalized.length) return Array.from(new Set(normalized));
	}
	const splitFallback = toNonEmptyString(fallback)?.split(',').map((s) => s.trim());
	if (splitFallback && splitFallback.length) {
		return Array.from(new Set(splitFallback.filter(Boolean)));
	}
	return undefined;
};

function parseEligibility(
	grant: GrantWithDetails,
): {
	summary?: string;
	applicantTypeNotes?: string;
	eligibleApplicants?: string[];
	eligibleGeographies?: string;
} {
	const raw = grant.details?.eligibilityRequirements;
	const value = isObject(raw) ? (raw as EligibilityValue) : undefined;

	const summary =
		toNonEmptyString(value?.eligibilityText) ??
		toNonEmptyString(value?.applicantEligibilityDesc) ??
		toNonEmptyString(value?.requirements);

	const applicantTypeNotes = toNonEmptyString(value?.applicantTypeNotes);

	const applicants =
		normalizeApplicants(value?.eligibleApplicants, grant.eligibleApplicants) ??
		toApplicantTypeList(value?.applicantTypes);

	const eligibleGeographies =
		toNonEmptyString(value?.eligibleGeographies) ??
		toNonEmptyString(grant.eligibleGeographies);

	return {
		summary,
		applicantTypeNotes,
		eligibleApplicants: applicants,
		eligibleGeographies,
	};
}

export function EligibilityRequirementsCard({
	grant,
}: {
	grant: GrantWithDetails;
}) {
	const eligibility = useMemo(() => parseEligibility(grant), [grant]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Eligibility Requirements</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{eligibility.summary && (
						<div className="space-y-1">
							<h3 className="font-medium">Eligibility Summary</h3>
							<p className="text-sm text-muted-foreground whitespace-pre-line">
								{eligibility.summary}
							</p>
						</div>
					)}

					{eligibility.applicantTypeNotes && (
						<div className="space-y-1">
							<h3 className="font-medium">Applicant Type Notes</h3>
							<p className="text-sm text-muted-foreground whitespace-pre-line">
								{eligibility.applicantTypeNotes}
							</p>
						</div>
					)}

					<div className="space-y-1">
						<h3 className="font-medium">Eligible Applicants</h3>
						<p className="text-sm text-muted-foreground">
							{eligibility.eligibleApplicants?.join(', ') ||
								grant.eligibleApplicants ||
								'Not specified'}
						</p>
					</div>

					<div className="space-y-1">
						<h3 className="font-medium">Eligible Geographies</h3>
						<p className="text-sm text-muted-foreground">
							{eligibility.eligibleGeographies || 'Not specified'}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
