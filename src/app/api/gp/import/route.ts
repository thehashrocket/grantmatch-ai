import { db } from '@/lib/db';
import { grantImportService } from '@/lib/services/GrantImportService';
import { parseDateFlexible } from '@/lib/utils';
import { z } from 'zod';

// Validation helper functions
const validationHelpers = {
	// Date validation
	isValidDate: (val: string) => parseDateFlexible(val) !== null,

	// Currency validation
	isValidCurrency: (val: string) => {
		if (val === 'Dependent') return true;
		return /^\$?[\d,]+(\.\d{2})?$/.test(val);
	},

	// Numeric validation
	isValidNumber: (val: string) => /^\d+$/.test(val),

	// CFDA number validation (XX.XXX format)
	isValidCFDA: (val: string) => /^\d{2}\.\d{3}$/.test(val),

	// Grant number validation (uppercase letters, numbers, hyphens)
	isValidGrantNumber: (val: string) => /^[A-Z0-9-]+$/.test(val),

	// Opportunity status validation
	isValidOppStatus: (val: string) =>
		['posted', 'closed', 'upcoming'].includes(val.toLowerCase()),

	// Portal ID validation
	isValidPortalId: (val: string) => /^\d+$/.test(val),
};

// Common validation schemas
const commonSchemas = {
	url: z.url('Invalid URL format'),
	requiredString: (fieldName: string) =>
		z.string().min(1, `${fieldName} is required`),
	requiredDate: (fieldName: string) =>
		z
			.string()
			.min(1, `${fieldName} is required`)
			.refine(validationHelpers.isValidDate, {
				message: `Invalid date format for ${fieldName}`,
			}),
	requiredCurrency: (fieldName: string) =>
		z
			.string()
			.min(1, `${fieldName} is required`)
			.refine(validationHelpers.isValidCurrency, {
				message: `Invalid currency format for ${fieldName}. Must be a currency value or 'Dependent'`,
			}),
	requiredNumber: (fieldName: string) =>
		z
			.string()
			.min(1, `${fieldName} is required`)
			.refine(validationHelpers.isValidNumber, {
				message: `${fieldName} must be a number`,
			}),
	requiredArray: (fieldName: string) =>
		z.array(z.string()).min(1, `At least one ${fieldName} is required`),
};

// California-specific schema
const californiaGrantSchema = z.object({
	runId: commonSchemas.requiredString('Run ID'),
	output: z.object({
		url: commonSchemas.url,
		title: commonSchemas.requiredString('Title'),
		deadline: commonSchemas.requiredString('Deadline'),
		open_date: commonSchemas.requiredString('Open date'),
		state_agency: commonSchemas.requiredString('State agency'),
		match_funding: commonSchemas.requiredString('Match funding information'),
		estimated_total_funding: commonSchemas.requiredCurrency(
			'Estimated total funding',
		),
		estimated_award_amounts: commonSchemas.requiredString(
			'Estimated award amounts',
		),
		funds_disbursement: commonSchemas.requiredString(
			'Funds disbursement information',
		),
		current_as_of: commonSchemas.requiredDate('Current as of date'),
		grantor: commonSchemas.requiredString('Grantor'),
		portal_id: z
			.string()
			.min(1, 'Portal ID is required')
			.refine(validationHelpers.isValidPortalId, {
				message: 'Portal ID must be a number',
			}),
		opportunity_type: commonSchemas.requiredString('Opportunity type'),
		purpose: commonSchemas.requiredString('Purpose'),
		eligible_applicants: commonSchemas.requiredArray('eligible applicant type'),
		eligible_geographies: z.string().optional(),
		source: z.literal('CALIFORNIA'),
	}),
});

// Federal-specific schema
const federalGrantSchema = z.object({
	runId: commonSchemas.requiredString('Run ID'),
	output: z.object({
		url: commonSchemas.url,
		title: commonSchemas.requiredString('Title'),
		number: z
			.string()
			.min(1, 'Grant number is required')
			.refine(validationHelpers.isValidGrantNumber, {
				message:
					'Grant number must contain only uppercase letters, numbers, and hyphens',
			}),
		agencyCode: commonSchemas.requiredString('Agency code'),
		agency: commonSchemas.requiredString('Agency name'),
		openDate: commonSchemas.requiredDate('Open date'),
		closeDate: commonSchemas.requiredDate('Close date'),
		oppStatus: z
			.string()
			.min(1, 'Opportunity status is required')
			.refine(validationHelpers.isValidOppStatus, {
				message: 'Invalid opportunity status',
			}),
		cfdaList: z
			.array(z.string())
			.min(1, 'At least one CFDA number is required')
			.refine((val) => val.every(validationHelpers.isValidCFDA), {
				message: 'Invalid CFDA number format. Must be in format XX.XXX',
			}),
		awardFloor: commonSchemas.requiredNumber('Award floor'),
		awardCeiling: commonSchemas.requiredNumber('Award ceiling'),
		grantor: commonSchemas.requiredString('Grantor'),
		source: z.literal('FEDERAL'),
	}),
});

// Combined schema using union
const schema = z.union([californiaGrantSchema, federalGrantSchema]);

export async function POST(req: Request) {
	try {
		const body = await req.json();
		console.log('body', body);
		const parsed = schema.parse(body);
		console.log('parsed', parsed);

		// 1. update the run to mark completed
		await db.grantImportRun.update({
			where: { id: parsed.runId },
			data: { status: 'COMPLETED' },
		});

		// 2. create the grant based on source
		if (parsed.output.source === 'CALIFORNIA') {
			await grantImportService.upsertCaliforniaGrant({
				url: parsed.output.url,
				title: parsed.output.title,
				deadline: parsed.output.deadline,
				openDate: parsed.output.open_date,
				stateAgency: parsed.output.state_agency,
				matchFunding: parsed.output.match_funding,
				estimatedTotalFunding: parsed.output.estimated_total_funding,
				estimatedAwardAmounts: parsed.output.estimated_award_amounts,
				fundsDisbursement: parsed.output.funds_disbursement,
				currentAsOf: parsed.output.current_as_of,
				grantor: parsed.output.grantor,
				portalId: parsed.output.portal_id,
				opportunityType: parsed.output.opportunity_type,
				purpose: parsed.output.purpose,
				eligibleApplicants: parsed.output.eligible_applicants,
				eligibleGeographies: parsed.output.eligible_geographies,
			});
		} else {
			await grantImportService.upsertFederalGrant({
				url: parsed.output.url,
				title: parsed.output.title,
				number: parsed.output.number,
				openDate: parsed.output.openDate,
				closeDate: parsed.output.closeDate,
				grantor: parsed.output.grantor,
				agencyCode: parsed.output.agencyCode,
				awardFloor: parsed.output.awardFloor,
				awardCeiling: parsed.output.awardCeiling,
				cfdaList: parsed.output.cfdaList,
			});
		}

		return new Response(
			JSON.stringify({ message: 'Grant imported successfully' }),
			{ status: 200 },
		);
	} catch (err) {
		console.error('Error processing grant:', err);
		if (err instanceof z.ZodError) {
			return new Response(
				JSON.stringify({ error: 'Validation failed', details: err.issues }),
				{ status: 400 },
			);
		}
		return new Response(JSON.stringify({ error: 'Invalid request' }), {
			status: 400,
		});
	}
}
