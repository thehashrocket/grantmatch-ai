'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { GrantSearchForm } from '@/components/grants/GrantSearchForm';
import { GrantCard } from '@/components/grants/GrantCard';
import { GrantSearchErrorBoundary } from '@/components/grants/GrantSearchErrorBoundary';
import { useGrantSearch } from '@/lib/hooks/useGrantSearch';
import { ActiveFilters } from '@/components/grants/ActiveFilters';


// Make a fetch grants button
// Makes a request to the /api/gp/start route
// Redirects to the /dashboard page

const fetchGrants = async (session: any) => {
  const response = await fetch('/api/gp/start', {
    method: 'POST',
    body: JSON.stringify(
      { dateStart: '2024-01-01', 
        dateEnd: '2024-01-31',
        requestedByUserId: session?.user?.id
      }
    ),
  });
  return response.json();
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const {
    grants,
    isLoading,
    error,
    handleSearch,
    handleClearSearch,
    updateFilter,
    searchFilters,
    resultsCount,
  } = useGrantSearch();

  // Handler for removing a single filter
  const handleRemoveFilter = (field: keyof typeof searchFilters, value?: string) => {
    if (field === 'source') {
      updateFilter(field, value || 'ALL');
    } else {
      updateFilter(field, '');
    }
    handleSearch({ ...searchFilters, [field]: field === 'source' ? (value || 'ALL') : '' });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Grant Matches</h1>
        <p className="text-muted-foreground">Loading...</p>
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
    <div className="container mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Grant Matches</h1>
      
      <GrantSearchForm 
        onSearch={handleSearch}
        onClear={handleClearSearch}
        isLoading={isLoading}
      />
      <ActiveFilters filters={searchFilters} onRemove={handleRemoveFilter} />
      
      {grants && (
        <div className="text-sm text-muted-foreground">
          {resultsCount} grant{resultsCount !== 1 ? 's' : ''} found
        </div>
      )}
      
      <GrantSearchErrorBoundary>
        <div className="grid gap-4 md:grid-cols-2">
          {grants?.map((grant: any) => (
            <GrantCard key={grant.id} grant={grant} />
          ))}
        </div>
      </GrantSearchErrorBoundary>
    </div>
  );
} 