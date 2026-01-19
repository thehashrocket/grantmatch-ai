// /src/components/bookmarks/useBookmarkFilters.ts

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
	applyBookmarkFiltersToParams,
	defaultBookmarkFilters,
	parseBookmarkFilters,
	type BookmarkFilterState,
} from '@/lib/utils/bookmark-filters';

const normalizeQueryString = (params: URLSearchParams) => {
	const entries = Array.from(params.entries()).sort(
		([keyA, valueA], [keyB, valueB]) => {
			if (keyA !== keyB) return keyA.localeCompare(keyB);
			return valueA.localeCompare(valueB);
		},
	);
	const normalized = new URLSearchParams();
	for (const [key, value] of entries) {
		normalized.append(key, value);
	}
	return normalized.toString();
};

export function useBookmarkFilters() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const searchParamsString = searchParams?.toString() ?? '';
	const initialFilters = useMemo(
		() => parseBookmarkFilters(new URLSearchParams(searchParamsString)),
		[searchParamsString],
	);
	const [filters, setFiltersState] =
		useState<BookmarkFilterState>(initialFilters);
	const lastWrittenQueryRef = useRef<string | null>(null);
	const debounceRef = useRef<number | null>(null);

	useEffect(() => {
		const normalizedQuery = normalizeQueryString(
			new URLSearchParams(searchParamsString),
		);
		if (normalizedQuery === lastWrittenQueryRef.current) {
			lastWrittenQueryRef.current = null;
			return;
		}
		const parsed = parseBookmarkFilters(
			new URLSearchParams(searchParamsString),
		);
		setFiltersState(parsed);
	}, [searchParamsString]);

	useEffect(() => {
		const nextParams = applyBookmarkFiltersToParams(
			new URLSearchParams(searchParamsString),
			filters,
		);
		const nextQuery = normalizeQueryString(nextParams);
		const currentQuery = normalizeQueryString(
			new URLSearchParams(searchParamsString),
		);
		if (nextQuery === currentQuery) return;
		if (debounceRef.current) {
			window.clearTimeout(debounceRef.current);
		}
		debounceRef.current = window.setTimeout(() => {
			lastWrittenQueryRef.current = nextQuery;
			const url = nextQuery ? `${pathname}?${nextQuery}` : pathname;
			router.replace(url);
		}, 200);
		return () => {
			if (debounceRef.current) {
				window.clearTimeout(debounceRef.current);
			}
		};
	}, [filters, pathname, router, searchParamsString]);

	const setFilters = (
		next:
			| BookmarkFilterState
			| ((prev: BookmarkFilterState) => BookmarkFilterState),
	) => {
		setFiltersState(next);
	};

	const resetFilters = () => setFiltersState({ ...defaultBookmarkFilters });

	return {
		filters,
		setFilters,
		resetFilters,
		searchParamsString,
	};
}
