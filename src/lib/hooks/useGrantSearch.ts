import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { GrantSearchFilters } from '@/lib/types/grant';

const initialFilters: GrantSearchFilters = {
	textSearch: '',
	minFunding: '',
	maxFunding: '',
	minDeadline: '',
	maxDeadline: '',
	deadlineWithinDays: '',
	minFitScore: '',
	maxFitScore: '',
	source: 'ALL',
	sort: 'FIT_DESC',
};

export function useGrantSearch() {
	const [searchFilters, setSearchFilters] =
		useState<GrantSearchFilters>(initialFilters);
	const [currentPage, setCurrentPage] = useState(1);
	const pageSize = 10;

	const {
		data: paginatedData,
		isLoading,
		error,
	} = trpc.grants.getMatchesPaginated.useQuery({
		...searchFilters,
		page: currentPage,
		pageSize,
	});

	const grantIds = paginatedData?.grants.map((grant) => grant.id) ?? [];

	const statusMapInput = { grantIds };

	const { data: bookmarkStatusMap, isLoading: isBookmarkMapLoading } =
		trpc.bookmark.statusMap.useQuery(statusMapInput, {
			enabled: grantIds.length > 0,
			retry: false,
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
		setSearchFilters((prev) => ({ ...prev, [field]: value }));
	};

	const clearFilter = (field: keyof GrantSearchFilters) => {
		setSearchFilters((prev) => ({ ...prev, [field]: '' }));
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
		bookmarkStatusMap,
		isBookmarkMapLoading,
		statusMapInput,
		currentPage,
		pageSize,

		// Actions
		handleSearch,
		handleClearSearch,
		updateFilter,
		clearFilter,
		handlePageChange,

		// Computed
		hasActiveFilters:
			searchFilters.textSearch !== '' ||
			searchFilters.minFunding !== '' ||
			searchFilters.maxFunding !== '' ||
			searchFilters.minDeadline !== '' ||
			searchFilters.maxDeadline !== '' ||
			searchFilters.deadlineWithinDays !== '' ||
			searchFilters.minFitScore !== '' ||
			searchFilters.maxFitScore !== '' ||
			searchFilters.source !== 'ALL' ||
			searchFilters.sort !== 'FIT_DESC',
		resultsCount: pagination?.total ?? 0,
		pagination,
	};
}
