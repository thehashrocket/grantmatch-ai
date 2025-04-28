import { db } from "@/lib/db";
import { z } from "zod";
import { parseDateFlexible, parseFundingAmount, toSmartTitleCase } from "@/lib/utils";
import { Prisma, $Enums } from "@/prisma/generated/client";
// import { GrantDeadlineType, GrantOpenDateType } from "@/prisma/generated/client";

// Schema looks like this:
// [
//   {
//     "output": {
//       "title": "INCREASING MAT SERVICES WITHIN DHCS-LICENSED SUD FACILITIES ROUND THREE",
//       "url": "https://www.grants.ca.gov/grants/increasing-mat-services-within-dhcs-licensed-sud-facilities-round-three/",
//       "deadline": "4/30/25",
//       "open_date": "Mar 24, 2025",
//       "state_agency": "Department of Health Care Services",
//       "match_funding": "No",
//       "estimated_total_funding": "$0",
//       "estimated_award_amounts": "Dependent",
//       "funds_disbursement": "Other",
//       "current_as_of": "April 8, 2025, 10:56 am",
//       "grantor": "Department of Health Care Services",
//       "portal_id": "99765",
//       "opportunity_type": "Grant",
//       "purpose": "The purpose of this project is to improve access to MAT in DHCS-licensed residential SUD facilities. This will be done by supporting costs associated with recruitment, mentorship, training, and other associated costs to increase provider knowledge and comfort with providing MAT through a collaborative learning opportunity for facilities to implement best practices.",
//       "eligible_applicants": [
//         "Nonprofit"
//       ],
//       "eligible_geographies": "Must be in the State of California."
//     },
//     "runId": "cma1dfnpc001msa4l0kkr5r74"
//   },
//   {
//     "output": {
//       "title": "Division of Boating and Waterways Surrendered and Abandoned Vessel Exchange (SAVE) FY25",
//       "url": "https://www.grants.ca.gov/grants/division-of-boating-and-waterways-surrendered-and-abandoned-vessel-exchange-save-fy25/",
//       "deadline": "4/30/25 17:00",
//       "open_date": "Mar 14, 2025",
//       "state_agency": "Department of Parks and Recreation",
//       "match_funding": "10%",
//       "estimated_total_funding": "$2,750,000",
//       "estimated_award_amounts": "Dependent",
//       "funds_disbursement": "Reimbursement(s)",
//       "current_as_of": "February 10, 2025, 1:34 pm",
//       "grantor": "Department of Parks and Recreation",
//       "portal_id": "97163",
//       "opportunity_type": "Grant",
//       "purpose": "Improve public and navigational safety and reduce environmental damage.",
//       "eligible_applicants": [
//         "Public Agency"
//       ],
//       "eligible_geographies": "California navigable waterways"
//     },
//     "runId": "cma1dfnpc001msa4l0kkr5r74"
//   }
// ]

// Define the schema for the incoming object
const schema = z.object({
  output: z.object({
    title: z.string(),
    url: z.string(),
    deadline: z.string(),
    open_date: z.string(),
    state_agency: z.string(),
    match_funding: z.string(),
    estimated_total_funding: z.string(),
    estimated_award_amounts: z.string(),
    funds_disbursement: z.string(),
    current_as_of: z.string(),
    grantor: z.string(),
    portal_id: z.string(),
    opportunity_type: z.string(),
    purpose: z.string(),
    eligible_applicants: z.array(z.string()),
    eligible_geographies: z.string(),
  }),
  runId: z.string(),
});

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
    console.log('body', body);

    // 1. update the run to mark completed
    await db.grantImportRun.update({
      where: { id: parsed.runId },
      data: { status: "COMPLETED" },
    });

    // 2. create the grant
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
      return new Response(JSON.stringify({ error: 'Invalid date format for current_as_of.' }), { status: 400 });
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
    };


    await db.grant.upsert({
      where: { portalId: grantData.portalId },
      create: grantData,
      update: grantData,
    });

    return new Response(JSON.stringify({ message: 'Hello, world!' }), { status: 200 });
  } catch (err) {
    console.error('Error parsing JSON:', err);
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }
}
