'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc/client';
import { getFitScoreCategory, getFitScoreColor, type GrantMatch } from '@/lib/types/grant';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DashboardPage() {
  const { data: grants, isLoading, error } = trpc.grants.getMatches.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Grant Matches</h1>
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 w-2/3 bg-muted rounded" />
                <div className="h-3 w-1/4 bg-muted rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="h-20 bg-muted rounded" />
                <div className="h-4 w-1/2 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Grants</h1>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Grant Matches</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {grants?.map((grant: GrantMatch) => {
          const category = getFitScoreCategory(grant.fitScore);
          const colorClasses = getFitScoreColor(category);
          
          return (
            <Card key={grant.id} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <CardTitle className="text-xl">
                      <Link 
                        href={grant.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {grant.title}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}>
                        Fit Score: {grant.fitScore.toFixed(1)}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatCurrency(grant.fundingAmount)}</div>
                    <div className="text-sm text-muted-foreground">
                      Due {formatDate(grant.deadline)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{grant.explanation}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 