import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { GrantCard } from './GrantCard';
import React from 'react';

interface GrantResultsProps {
  grants: any[] | undefined;
  isLoading: boolean;
  error: any;
}

export function GrantResults({ grants, isLoading, error }: GrantResultsProps) {
  if (isLoading) {
    return (
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

  if (!grants || grants.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No grants found.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {grants.map((grant) => (
        <GrantCard key={grant.id} grant={grant} />
      ))}
    </div>
  );
} 