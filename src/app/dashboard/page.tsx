'use client';

import { useSession } from 'next-auth/react';
import { GrantSearchForm } from '@/components/grants/GrantSearchForm';
import { useGrantSearch } from '@/lib/hooks/useGrantSearch';
import { ActiveFilters } from '@/components/grants/ActiveFilters';
import { GrantResults } from '@/components/grants/GrantResults';

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
    currentPage,
    pageSize,
    handlePageChange,
  } = useGrantSearch();

  // Handler for removing a single filter
  const handleRemoveFilter = (field: keyof typeof searchFilters, value?: string) => {
    if (field === 'source') {
      updateFilter(field, value || 'ALL');
    } else {
      updateFilter(field, '');
    }
    const newFilters = { ...searchFilters, [field]: field === 'source' ? (value || 'ALL') : '' };
    handleSearch(newFilters);
  };

  // Retry handler
  const handleRetry = () => {
    // Refetch the current search
    handleSearch(searchFilters);
  };

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
      
      <GrantResults 
        grants={grants} 
        isLoading={isLoading} 
        error={error}
        onRetry={handleRetry}
        page={currentPage}
        pageSize={pageSize}
        total={resultsCount}
        onPageChange={handlePageChange}
      />
    </div>
  );
} 