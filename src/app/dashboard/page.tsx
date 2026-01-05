'use client';

import { GrantSearchForm } from '@/components/grants/GrantSearchForm';
import { useGrantSearch } from '@/lib/hooks/useGrantSearch';
import { ActiveFilters } from '@/components/grants/ActiveFilters';
import { GrantResults } from '@/components/grants/GrantResults';
import type { GrantSearchFilters } from '@/lib/types/grant';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { buildReturnTo } from '@/lib/utils/return-to';

// Make a fetch grants button
// Makes a request to the /api/gp/start route
// Redirects to the /dashboard page

export default function DashboardPage() {
	const searchParams = useSearchParams();
	const pathname = usePathname();
	const scrollRestored = useRef(false);
	const {
		grants,
		isLoading,
		error,
		handleSearch,
		handleClearSearch,
		searchFilters,
		resultsCount,
		currentPage,
		pageSize,
		handlePageChange,
		bookmarkStatusMap,
		statusMapInput,
		matchIndexStatus,
	} = useGrantSearch();

	// Handler for removing a single filter
	const handleRemoveFilter = (
		field: keyof GrantSearchFilters,
		value?: string,
	) => {
		const newFilters = {
			...searchFilters,
			[field]:
				field === 'source'
					? value || 'ALL'
					: field === 'sort'
						? 'FIT_DESC'
						: '',
		};
		handleSearch(newFilters);
	};

	// Retry handler
	const handleRetry = () => {
		// Refetch the current search
		handleSearch(searchFilters);
	};

	const returnTo = buildReturnTo(pathname, searchParams?.toString() ?? '');
	const returnQuery = searchParams?.toString() ?? '';

	useEffect(() => {
		const key = `dashboard-scroll:${searchParams?.toString() ?? ''}`;
		if (scrollRestored.current) return;
		const saved =
			typeof window !== 'undefined' ? sessionStorage.getItem(key) : null;
		if (saved) {
			scrollRestored.current = true;
			window.scrollTo({ top: Number(saved) || 0 });
		}
	}, [searchParams]);

	useEffect(() => {
		const key = `dashboard-scroll:${searchParams?.toString() ?? ''}`;
		return () => {
			try {
				sessionStorage.setItem(key, String(window.scrollY));
			} catch {
				// ignore storage failures
			}
		};
	}, [searchParams]);

	return (
		<div className="container mx-auto space-y-4">
			<h1 className="text-3xl font-bold">Grant Matches</h1>
			{matchIndexStatus === 'RUNNING' ? (
				<div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 flex items-center gap-2">
					<span className="font-medium">Recompute in progress</span>
					<span className="text-amber-700">
						We’re refreshing matches for your org—scores and explanations may
						update soon.
					</span>
				</div>
			) : null}

			<GrantSearchForm
				filters={searchFilters}
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
				bookmarkStatusMap={bookmarkStatusMap}
				statusMapInput={statusMapInput}
				returnTo={returnTo}
				returnQuery={returnQuery}
			/>
		</div>
	);
}
