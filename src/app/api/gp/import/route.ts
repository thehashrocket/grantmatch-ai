import { db } from "@/lib/db";
import { z } from "zod";
import { parseDateFlexible, parseFundingAmount, toSmartTitleCase } from "@/lib/utils";
import { Prisma, $Enums } from "@/prisma/generated/client";
// import { GrantDeadlineType, GrantOpenDateType } from "@/prisma/generated/client";

// Validation helper functions
const validationHelpers = {
  // Date validation
  isValidDate: (val: string) => parseDateFlexible(val) !== null,
  
  // Currency validation
  isValidCurrency: (val: string) => {
    if (val === "Dependent") return true;
    return /^\$?[\d,]+(\.\d{2})?$/.test(val);
  },
  
  // Numeric validation
  isValidNumber: (val: string) => /^\d+$/.test(val),
  
  // CFDA number validation (XX.XXX format)
  isValidCFDA: (val: string) => /^\d{2}\.\d{3}$/.test(val),
  
  // Grant number validation (uppercase letters, numbers, hyphens)
  isValidGrantNumber: (val: string) => /^[A-Z0-9-]+$/.test(val),
  
  // Opportunity status validation
  isValidOppStatus: (val: string) => ["posted", "closed", "upcoming"].includes(val.toLowerCase()),
  
  // Portal ID validation
  isValidPortalId: (val: string) => /^\d+$/.test(val),
};

// Common validation schemas
const commonSchemas = {
  url: z.string().url("Invalid URL format"),
  requiredString: (fieldName: string) => z.string().min(1, `${fieldName} is required`),
  requiredDate: (fieldName: string) => z.string()
    .min(1, `${fieldName} is required`)
    .refine(validationHelpers.isValidDate, {
      message: `Invalid date format for ${fieldName}`
    }),
  requiredCurrency: (fieldName: string) => z.string()
    .min(1, `${fieldName} is required`)
    .refine(validationHelpers.isValidCurrency, {
      message: `Invalid currency format for ${fieldName}. Must be a currency value or 'Dependent'`
    }),
  requiredNumber: (fieldName: string) => z.string()
    .min(1, `${fieldName} is required`)
    .refine(validationHelpers.isValidNumber, {
      message: `${fieldName} must be a number`
    }),
  requiredArray: (fieldName: string) => z.array(z.string())
    .min(1, `At least one ${fieldName} is required`),
};

// Base schema for common fields
const baseGrantSchema = z.object({
  runId: commonSchemas.requiredString("Run ID"),
  output: z.object({
    url: commonSchemas.url,
    title: commonSchemas.requiredString("Title"),
    grantor: commonSchemas.requiredString("Grantor"),
  }),
});

// California-specific schema
const californiaGrantSchema = z.object({
  runId: commonSchemas.requiredString("Run ID"),
  output: z.object({
    url: commonSchemas.url,
    title: commonSchemas.requiredString("Title"),
    deadline: commonSchemas.requiredString("Deadline"),
    open_date: commonSchemas.requiredString("Open date"),
    state_agency: commonSchemas.requiredString("State agency"),
    match_funding: commonSchemas.requiredString("Match funding information"),
    estimated_total_funding: commonSchemas.requiredCurrency("Estimated total funding"),
    estimated_award_amounts: commonSchemas.requiredString("Estimated award amounts"),
    funds_disbursement: commonSchemas.requiredString("Funds disbursement information"),
    current_as_of: commonSchemas.requiredDate("Current as of date"),
    grantor: commonSchemas.requiredString("Grantor"),
    portal_id: z.string()
      .min(1, "Portal ID is required")
      .refine(validationHelpers.isValidPortalId, {
        message: "Portal ID must be a number"
      }),
    opportunity_type: commonSchemas.requiredString("Opportunity type"),
    purpose: commonSchemas.requiredString("Purpose"),
    eligible_applicants: commonSchemas.requiredArray("eligible applicant type"),
    eligible_geographies: z.string().optional(),
    source: z.literal('CALIFORNIA'),
  }),
});

// Federal-specific schema
const federalGrantSchema = z.object({
  runId: commonSchemas.requiredString("Run ID"),
  output: z.object({
    url: commonSchemas.url,
    title: commonSchemas.requiredString("Title"),
    number: z.string()
      .min(1, "Grant number is required")
      .refine(validationHelpers.isValidGrantNumber, {
        message: "Grant number must contain only uppercase letters, numbers, and hyphens"
      }),
    agencyCode: commonSchemas.requiredString("Agency code"),
    agency: commonSchemas.requiredString("Agency name"),
    openDate: commonSchemas.requiredDate("Open date"),
    closeDate: commonSchemas.requiredDate("Close date"),
    oppStatus: z.string()
      .min(1, "Opportunity status is required")
      .refine(validationHelpers.isValidOppStatus, {
        message: "Invalid opportunity status"
      }),
    cfdaList: z.array(z.string())
      .min(1, "At least one CFDA number is required")
      .refine((val) => val.every(validationHelpers.isValidCFDA), {
        message: "Invalid CFDA number format. Must be in format XX.XXX"
      }),
    awardFloor: commonSchemas.requiredNumber("Award floor"),
    awardCeiling: commonSchemas.requiredNumber("Award ceiling"),
    grantor: commonSchemas.requiredString("Grantor"),
    source: z.literal('FEDERAL'),
  }),
});

// Combined schema using union
const schema = z.union([californiaGrantSchema, federalGrantSchema]);

// Helper to map string to enum
function mapToEnumType(value: string, validTypes: string[]): string {
  const normalized = value.trim().toUpperCase();
  if (validTypes.includes(normalized)) return normalized;
  // Common mappings
  if (["ONGOING", "ROLLING", "TBD", "CLOSED", "UNKNOWN"].includes(normalized)) return normalized;
  return "UNKNOWN";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('body', body);
    const parsed = schema.parse(body);
    console.log('parsed', parsed);

    // 1. update the run to mark completed
    await db.grantImportRun.update({
      where: { id: parsed.runId },
      data: { status: "COMPLETED" },
    });

    // 2. create the grant based on source
    if (parsed.output.source === 'CALIFORNIA') {
      await handleCaliforniaGrant(parsed as z.infer<typeof californiaGrantSchema>);
    } else {
      await handleFederalGrant(parsed as z.infer<typeof federalGrantSchema>);
    }

    return new Response(JSON.stringify({ message: 'Grant imported successfully' }), { status: 200 });
  } catch (err) {
    console.error('Error processing grant:', err);
    if (err instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: err.errors }), { status: 400 });
    }
    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400 });
  }
}

async function handleCaliforniaGrant(parsed: z.infer<typeof californiaGrantSchema>) {
  const deadlineDate = parseDateFlexible(parsed.output.deadline);
  let deadlineType: $Enums.GrantDeadlineType | null = null;
  if (deadlineDate) {
    deadlineType = $Enums.GrantDeadlineType.FIXED;
  } else {
    const type = mapToEnumType(parsed.output.deadline, ["FIXED", "ONGOING", "ROLLING", "TBD", "CLOSED", "UNKNOWN"]);
    deadlineType = $Enums.GrantDeadlineType[type as keyof typeof $Enums.GrantDeadlineType] ?? $Enums.GrantDeadlineType.UNKNOWN;
  }

  const openDateDate = parseDateFlexible(parsed.output.open_date);
  let openDateType: $Enums.GrantOpenDateType | null = null;
  if (openDateDate) {
    openDateType = $Enums.GrantOpenDateType.FIXED;
  } else {
    const type = mapToEnumType(parsed.output.open_date, ["FIXED", "ONGOING", "ROLLING", "TBD", "CLOSED", "UNKNOWN"]);
    openDateType = $Enums.GrantOpenDateType[type as keyof typeof $Enums.GrantOpenDateType] ?? $Enums.GrantOpenDateType.UNKNOWN;
  }

  const currentAsOfDate = parseDateFlexible(parsed.output.current_as_of);
  if (!currentAsOfDate) {
    throw new Error('Invalid date format for current_as_of.');
  }

  const grantData = {
    url: parsed.output.url,
    title: toSmartTitleCase(parsed.output.title),
    deadline: deadlineDate ?? null,
    deadlineType,
    openDate: openDateDate ?? null,
    openDateType,
    stateAgency: parsed.output.state_agency,
    matchFunding: parsed.output.match_funding,
    estimatedTotalFunding: BigInt(parseFundingAmount(parsed.output.estimated_total_funding)),
    estimatedAwardAmounts: parsed.output.estimated_award_amounts,
    fundsDisbursment: parsed.output.funds_disbursement,
    currentAsOf: currentAsOfDate,
    grantor: parsed.output.grantor,
    portalId: parseInt(parsed.output.portal_id),
    opportunityType: parsed.output.opportunity_type,
    purpose: parsed.output.purpose,
    eligibleApplicants: parsed.output.eligible_applicants.join(', '),
    eligibleGeographies: parsed.output.eligible_geographies,
    source: $Enums.GrantSource.CALIFORNIA,
  };

  await db.grant.upsert({
    where: { 
      portalId_source: {
        portalId: grantData.portalId,
        source: grantData.source
      }
    },
    create: grantData,
    update: grantData,
  });
}

async function handleFederalGrant(parsed: z.infer<typeof federalGrantSchema>) {
  const openDate = parseDateFlexible(parsed.output.openDate);
  const closeDate = parseDateFlexible(parsed.output.closeDate);

  const grantData = {
    url: parsed.output.url,
    title: toSmartTitleCase(parsed.output.title),
    number: parsed.output.number,
    openDate: openDate ?? null,
    deadline: closeDate ?? null,
    grantor: parsed.output.grantor,
    agencyCode: parsed.output.agencyCode,
    awardFloor: BigInt(parseFundingAmount(parsed.output.awardFloor)),
    awardCeiling: BigInt(parseFundingAmount(parsed.output.awardCeiling)),
    cfdaList: parsed.output.cfdaList,
    source: $Enums.GrantSource.FEDERAL,
  };

  // For Federal grants, we'll use the number as the unique identifier
  await db.grant.upsert({
    where: { number: grantData.number },
    create: grantData,
    update: grantData,
  });
}
