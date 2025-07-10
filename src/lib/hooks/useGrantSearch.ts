import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import { type GrantSearchFilters } from '@/components/grants/GrantSearchForm';

const initialFilters: GrantSearchFilters = {
  textSearch: '',
  minFunding: '',
  maxFunding: '',
  minDeadline: '',
  maxDeadline: '',
  minFitScore: '',
  maxFitScore: '',
  source: 'ALL',
};

export function useGrantSearch() {
  const [searchFilters, setSearchFilters] = useState<GrantSearchFilters>(initialFilters);

  const { data: grants, isLoading, error } = trpc.grants.getMatches.useQuery(searchFilters);

  const handleSearch = (filters: GrantSearchFilters) => {
    setSearchFilters(filters);
  };

  const handleClearSearch = () => {
    setSearchFilters(initialFilters);
  };

  const updateFilter = (field: keyof GrantSearchFilters, value: string) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilter = (field: keyof GrantSearchFilters) => {
    setSearchFilters(prev => ({ ...prev, [field]: '' }));
  };

  return {
    // State
    searchFilters,
    grants,
    isLoading,
    error,
    
    // Actions
    handleSearch,
    handleClearSearch,
    updateFilter,
    clearFilter,
    
    // Computed
    hasActiveFilters: Object.values(searchFilters).some(value => value !== ''),
    resultsCount: grants?.length ?? 0,
  };
} 