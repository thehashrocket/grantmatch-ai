import { useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { GrantSearchFilters } from '@/lib/types/grant';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const pageSize = 10;

	const searchFilters = useMemo<GrantSearchFilters>(() => {
		const params = searchParams
			? new URLSearchParams(searchParams.toString())
			: null;
		if (!params) return initialFilters;
		return {
			textSearch: params.get('textSearch') ?? '',
			minFunding: params.get('minFunding') ?? '',
			maxFunding: params.get('maxFunding') ?? '',
			minDeadline: params.get('minDeadline') ?? '',
			maxDeadline: params.get('maxDeadline') ?? '',
			deadlineWithinDays: params.get('deadlineWithinDays') ?? '',
			minFitScore: params.get('minFitScore') ?? '',
			maxFitScore: params.get('maxFitScore') ?? '',
			source: (params.get('source') as GrantSearchFilters['source']) ?? 'ALL',
			sort: (params.get('sort') as GrantSearchFilters['sort']) ?? 'FIT_DESC',
		};
	}, [searchParams]);

	const currentPage = useMemo(() => {
		const pageParam = searchParams?.get('page');
		const parsed = pageParam ? Number(pageParam) : 1;
		return Number.isNaN(parsed) || parsed < 1 ? 1 : parsed;
	}, [searchParams]);

	const buildSearchParams = (filters: GrantSearchFilters, page = 1) => {
		const params = new URLSearchParams();
		const entries: Array<[keyof GrantSearchFilters, string]> = [
			['textSearch', filters.textSearch],
			['minFunding', filters.minFunding],
			['maxFunding', filters.maxFunding],
			['minDeadline', filters.minDeadline],
			['maxDeadline', filters.maxDeadline],
			['deadlineWithinDays', filters.deadlineWithinDays],
			['minFitScore', filters.minFitScore],
			['maxFitScore', filters.maxFitScore],
			['source', filters.source],
			['sort', filters.sort],
		];

		entries.forEach(([key, value]) => {
			const defaultValue = initialFilters[key];
			if (value && value !== defaultValue) {
				params.set(key, value);
			}
			if (value === '' && defaultValue !== '') {
				params.delete(key);
			}
			if (value === defaultValue) {
				params.delete(key);
			}
		});

		if (page > 1) {
			params.set('page', String(page));
		}

		return params;
	};

	const pushFilters = (filters: GrantSearchFilters, page = 1) => {
		const params = buildSearchParams(filters, page);
		const query = params.toString();
		const url = query ? `${pathname}?${query}` : pathname;
		router.push(url);
	};

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
		pushFilters(filters, 1);
	};

	const handleClearSearch = () => {
		pushFilters(initialFilters, 1);
	};

	const updateFilter = (field: keyof GrantSearchFilters, value: string) => {
		const next = { ...searchFilters, [field]: value };
		pushFilters(next, 1);
	};

	const clearFilter = (field: keyof GrantSearchFilters) => {
		const next = {
			...searchFilters,
			[field]:
				field === 'source'
					? initialFilters.source
					: field === 'sort'
						? initialFilters.sort
						: '',
		};
		pushFilters(next, 1);
	};

	const handlePageChange = (page: number) => {
		pushFilters(searchFilters, page);
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
		matchIndexStatus: paginatedData?.matchIndexStatus ?? null,

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
