"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import GrantDetailedDescription from "@/components/grants/GrantDetailedDescription";
import type { Prisma } from '@/prisma/generated/client';

type EligibilityRequirements = {
  requirements?: string;
  eligibleApplicants?: string[];
  eligibleGeographies?: string;
};

type FundingDetails = {
  fundingMethod?: string;
  fundingMethodNotes?: string;
  matchingFunds?: string;
  matchRequirement?: string;
  fundingSource?: string;
  fundingSourceNotes?: string;
  totalEstimatedFunding?: string;
  expectedNumberOfAwards?: string;
  estimatedAmountPerAward?: string;
  letterOfIntentRequired?: string;
  requiresMatchedFunding?: string;
};

type GrantData = Prisma.GrantGetPayload<{ include: { details: true, attachments: true } }>;

interface GrantDetailsClientProps {
  grantId: string;
  initialGrant: GrantData;
}

const isJsonObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

function parseEligibilityRequirements(value: unknown): EligibilityRequirements | undefined {
  if (!isJsonObject(value)) return undefined;

  const requirements = typeof value.requirements === 'string' ? value.requirements : undefined;
  const eligibleApplicants = Array.isArray(value.eligibleApplicants)
    ? value.eligibleApplicants.filter((item): item is string => typeof item === 'string')
    : undefined;
  const eligibleGeographies = typeof value.eligibleGeographies === 'string' ? value.eligibleGeographies : undefined;

  if (!requirements && !eligibleApplicants && !eligibleGeographies) {
    return undefined;
  }

  return {
    requirements,
    eligibleApplicants,
    eligibleGeographies,
  };
}

function parseFundingDetails(value: unknown): FundingDetails | undefined {
  if (!isJsonObject(value)) return undefined;

  const entries: Array<[keyof FundingDetails, unknown]> = [
    ['fundingMethod', value.fundingMethod],
    ['fundingMethodNotes', value.fundingMethodNotes],
    ['matchingFunds', value.matchingFunds],
    ['matchRequirement', value.matchRequirement],
    ['fundingSource', value.fundingSource],
    ['fundingSourceNotes', value.fundingSourceNotes],
    ['totalEstimatedFunding', value.totalEstimatedFunding],
    ['expectedNumberOfAwards', value.expectedNumberOfAwards],
    ['estimatedAmountPerAward', value.estimatedAmountPerAward],
    ['letterOfIntentRequired', value.letterOfIntentRequired],
    ['requiresMatchedFunding', value.requiresMatchedFunding],
  ];

  const normalized: FundingDetails = {};
  let hasValue = false;

  for (const [key, raw] of entries) {
    if (typeof raw === 'string' && raw.trim() !== '') {
      normalized[key] = raw;
      hasValue = true;
    }
  }

  return hasValue ? normalized : undefined;
}

function GrantDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-[250px]" />
        <Skeleton className="h-4 w-[200px]" />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
}

export default function GrantDetailsClient({ grantId, initialGrant }: GrantDetailsClientProps) {
  const [grant, setGrant] = useState<GrantData>(initialGrant);
  const [loading, setLoading] = useState(!initialGrant.details);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const eligibilityRequirements = useMemo(
    () => parseEligibilityRequirements(grant.details?.eligibilityRequirements),
    [grant.details?.eligibilityRequirements]
  );

  const fundingDetails = useMemo(
    () => parseFundingDetails(grant.details?.fundingDetails),
    [grant.details?.fundingDetails]
  );

  useEffect(() => {
    let cancelled = false;
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/grants/${grantId}/details`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json() as GrantData;
        if (!cancelled) {
          setGrant(data);
          if (data.details) {
            setLoading(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch {
        // Optionally handle error
      }
    }

    // If details are missing, poll every 3s
    if (!grant.details) {
      setLoading(true);
      fetchDetails();
      intervalRef.current = setInterval(fetchDetails, 3000);
    } else {
      setLoading(false);
    }
    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [grantId, grant.details]);

  if (loading) return <GrantDetailsSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{grant.title}</h1>
        <p className="text-muted-foreground">
          Portal ID: {grant.portalId}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Purpose</h3>
              <p className="text-sm text-muted-foreground">{grant.purpose}</p>
            </div>
            <div>
              <h3 className="font-medium">State Agency</h3>
              <p className="text-sm text-muted-foreground">{grant.stateAgency}</p>
            </div>
            <div>
              <h3 className="font-medium">Grantor</h3>
              <p className="text-sm text-muted-foreground">{grant.grantor}</p>
            </div>
            <div>
              <h3 className="font-medium">Opportunity Type</h3>
              <p className="text-sm text-muted-foreground">{grant.opportunityType}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Funding Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium">Estimated Total Funding</h3>
              <p className="text-sm text-muted-foreground">
                ${Number(grant.estimatedTotalFunding ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <h3 className="font-medium">Award Amounts</h3>
              <p className="text-sm text-muted-foreground">{grant.estimatedAwardAmounts}</p>
            </div>
            <div>
              <h3 className="font-medium">Match Funding</h3>
              <p className="text-sm text-muted-foreground">{grant.matchFunding}</p>
            </div>
            <div>
              <h3 className="font-medium">Funds Disbursement</h3>
              <p className="text-sm text-muted-foreground">{grant.fundsDisbursment}</p>
            </div>
          </CardContent>
        </Card>

        {grant.details && (
          <>
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Detailed Description</CardTitle>
              </CardHeader>
              <CardContent>
                <GrantDetailedDescription description={grant.details.description ?? grant.details.synopsisHtml} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Eligibility Requirements</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Eligible Applicants</h3>
                    <p className="text-sm text-muted-foreground">{grant.eligibleApplicants}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Eligible Geographies</h3>
                    <p className="text-sm text-muted-foreground">{grant.eligibleGeographies}</p>
                  </div>
                  {eligibilityRequirements && (
                    <div>
                      <h3 className="font-medium">Additional Requirements</h3>
                      <div className="mt-2 space-y-2">
                        {eligibilityRequirements.requirements && (
                          <p className="text-sm text-muted-foreground">
                            {eligibilityRequirements.requirements}
                          </p>
                        )}
                        {eligibilityRequirements.eligibleApplicants && (
                          <div>
                            <span className="font-medium">Eligible Applicants: </span>
                            <span className="text-sm text-muted-foreground">
                              {eligibilityRequirements.eligibleApplicants.join(', ')}
                            </span>
                          </div>
                        )}
                        {eligibilityRequirements.eligibleGeographies && (
                          <div>
                            <span className="font-medium">Eligible Geographies: </span>
                            <span className="text-sm text-muted-foreground">
                              {eligibilityRequirements.eligibleGeographies}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Funding Details</CardTitle>
              </CardHeader>
              <CardContent>
                {fundingDetails && (
                  <div className="space-y-2">
                    {fundingDetails.fundingMethod && (
                      <div>
                        <span className="font-medium">Funding Method: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.fundingMethod}</span>
                        {fundingDetails.fundingMethodNotes && (
                          <p className="text-xs text-muted-foreground mt-1">{fundingDetails.fundingMethodNotes}</p>
                        )}
                      </div>
                    )}
                    {fundingDetails.fundingSource && (
                      <div>
                        <span className="font-medium">Funding Source: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.fundingSource}</span>
                        {fundingDetails.fundingSourceNotes && (
                          <p className="text-xs text-muted-foreground mt-1">{fundingDetails.fundingSourceNotes}</p>
                        )}
                      </div>
                    )}
                    {fundingDetails.totalEstimatedFunding && (
                      <div>
                        <span className="font-medium">Total Estimated Funding: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.totalEstimatedFunding}</span>
                      </div>
                    )}
                    {fundingDetails.expectedNumberOfAwards && (
                      <div>
                        <span className="font-medium">Expected Number of Awards: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.expectedNumberOfAwards}</span>
                      </div>
                    )}
                    {fundingDetails.estimatedAmountPerAward && (
                      <div>
                        <span className="font-medium">Estimated Amount Per Award: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.estimatedAmountPerAward}</span>
                      </div>
                    )}
                    {fundingDetails.letterOfIntentRequired && (
                      <div>
                        <span className="font-medium">Letter of Intent Required: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.letterOfIntentRequired}</span>
                      </div>
                    )}
                    {fundingDetails.requiresMatchedFunding && (
                      <div>
                        <span className="font-medium">Requires Matched Funding: </span>
                        <span className="text-sm text-muted-foreground">{fundingDetails.requiresMatchedFunding}</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
} 
