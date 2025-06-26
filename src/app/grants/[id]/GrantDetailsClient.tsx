"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import GrantDetailedDescription from "@/components/grants/GrantDetailedDescription";

interface GrantDetailsClientProps {
  grantId: string;
  initialGrant: any;
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
  const [grant, setGrant] = useState(initialGrant);
  const [loading, setLoading] = useState(!initialGrant.details);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchDetails() {
      try {
        const res = await fetch(`/api/grants/${grantId}/details`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setGrant(data);
          if (data.details) {
            setLoading(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
          }
        }
      } catch (e) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grantId]);

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
                ${Number(grant.estimatedTotalFunding).toLocaleString()}
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
                <GrantDetailedDescription description={grant.details.description} />
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
                  {grant.details.eligibilityRequirements && (
                    <div>
                      <h3 className="font-medium">Additional Requirements</h3>
                      <div className="mt-2 space-y-2">
                        {grant.details.eligibilityRequirements.requirements && (
                          <p className="text-sm text-muted-foreground">
                            {grant.details.eligibilityRequirements.requirements}
                          </p>
                        )}
                        {grant.details.eligibilityRequirements.eligibleApplicants && Array.isArray(grant.details.eligibilityRequirements.eligibleApplicants) && (
                          <div>
                            <span className="font-medium">Eligible Applicants: </span>
                            <span className="text-sm text-muted-foreground">
                              {grant.details.eligibilityRequirements.eligibleApplicants.join(', ')}
                            </span>
                          </div>
                        )}
                        {grant.details.eligibilityRequirements.eligibleGeographies && (
                          <div>
                            <span className="font-medium">Eligible Geographies: </span>
                            <span className="text-sm text-muted-foreground">
                              {grant.details.eligibilityRequirements.eligibleGeographies}
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
                {grant.details.fundingDetails && (
                  <div className="space-y-2">
                    {grant.details.fundingDetails.fundingMethod && (
                      <div>
                        <span className="font-medium">Funding Method: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.fundingMethod}</span>
                        {grant.details.fundingDetails.fundingMethodNotes && (
                          <p className="text-xs text-muted-foreground mt-1">{grant.details.fundingDetails.fundingMethodNotes}</p>
                        )}
                      </div>
                    )}
                    {grant.details.fundingDetails.fundingSource && (
                      <div>
                        <span className="font-medium">Funding Source: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.fundingSource}</span>
                        {grant.details.fundingDetails.fundingSourceNotes && (
                          <p className="text-xs text-muted-foreground mt-1">{grant.details.fundingDetails.fundingSourceNotes}</p>
                        )}
                      </div>
                    )}
                    {grant.details.fundingDetails.totalEstimatedFunding && (
                      <div>
                        <span className="font-medium">Total Estimated Funding: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.totalEstimatedFunding}</span>
                      </div>
                    )}
                    {grant.details.fundingDetails.expectedNumberOfAwards && (
                      <div>
                        <span className="font-medium">Expected Number of Awards: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.expectedNumberOfAwards}</span>
                      </div>
                    )}
                    {grant.details.fundingDetails.estimatedAmountPerAward && (
                      <div>
                        <span className="font-medium">Estimated Amount Per Award: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.estimatedAmountPerAward}</span>
                      </div>
                    )}
                    {grant.details.fundingDetails.letterOfIntentRequired && (
                      <div>
                        <span className="font-medium">Letter of Intent Required: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.letterOfIntentRequired}</span>
                      </div>
                    )}
                    {grant.details.fundingDetails.requiresMatchedFunding && (
                      <div>
                        <span className="font-medium">Requires Matched Funding: </span>
                        <span className="text-sm text-muted-foreground">{grant.details.fundingDetails.requiresMatchedFunding}</span>
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