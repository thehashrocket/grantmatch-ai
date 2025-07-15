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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const { data: paginatedData, isLoading, error } = trpc.grants.getMatchesPaginated.useQuery({
    ...searchFilters,
    page: currentPage,
    pageSize,
  });

  const grants = paginatedData?.grants;
  const pagination = paginatedData?.pagination;

  const handleSearch = (filters: GrantSearchFilters) => {
    setSearchFilters(filters);
    setCurrentPage(1); // Reset to first page on new search
  };

  const handleClearSearch = () => {
    setSearchFilters(initialFilters);
    setCurrentPage(1);
  };

  const updateFilter = (field: keyof GrantSearchFilters, value: string) => {
    setSearchFilters(prev => ({ ...prev, [field]: value }));
  };

  const clearFilter = (field: keyof GrantSearchFilters) => {
    setSearchFilters(prev => ({ ...prev, [field]: '' }));
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return {
    // State
    searchFilters,
    grants,
    isLoading,
    error,
    currentPage,
    pageSize,
    
    // Actions
    handleSearch,
    handleClearSearch,
    updateFilter,
    clearFilter,
    handlePageChange,
    
    // Computed
    hasActiveFilters: Object.values(searchFilters).some(value => value !== ''),
    resultsCount: pagination?.total ?? 0,
    pagination,
  };
} 