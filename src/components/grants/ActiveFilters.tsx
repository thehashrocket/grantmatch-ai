import { X } from 'lucide-react';
import type { GrantSearchFilters } from '@/lib/types/grant';

interface ActiveFiltersProps {
	filters: GrantSearchFilters;
	onRemove: (field: keyof GrantSearchFilters, value?: string) => void;
}

export function ActiveFilters({ filters, onRemove }: ActiveFiltersProps) {
	const hasActiveFilters =
		filters.textSearch !== '' ||
		filters.minFunding !== '' ||
		filters.maxFunding !== '' ||
		filters.minDeadline !== '' ||
		filters.maxDeadline !== '' ||
		filters.deadlineWithinDays !== '' ||
		filters.minFitScore !== '' ||
		filters.maxFitScore !== '' ||
		(filters.source && filters.source !== 'ALL') ||
		filters.sort !== 'FIT_DESC';

	if (!hasActiveFilters) return null;

	return (
		<div className="pt-4 border-t mb-6">
			<div className="flex items-center justify-between mb-2">
				<span className="text-sm font-medium text-muted-foreground">
					Active Filters:
				</span>
			</div>
			<div className="flex flex-wrap gap-2">
				{filters.textSearch && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
						Search: &ldquo;{filters.textSearch}&rdquo;
						<button
							type="button"
							onClick={() => onRemove('textSearch')}
							className="ml-1 hover:text-blue-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.minFunding && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
						Min: ${filters.minFunding}
						<button
							type="button"
							onClick={() => onRemove('minFunding')}
							className="ml-1 hover:text-green-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.maxFunding && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
						Max: ${filters.maxFunding}
						<button
							type="button"
							onClick={() => onRemove('maxFunding')}
							className="ml-1 hover:text-green-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.minDeadline && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
						From: {new Date(filters.minDeadline).toLocaleDateString()}
						<button
							type="button"
							onClick={() => onRemove('minDeadline')}
							className="ml-1 hover:text-orange-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.maxDeadline && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
						To: {new Date(filters.maxDeadline).toLocaleDateString()}
						<button
							type="button"
							onClick={() => onRemove('maxDeadline')}
							className="ml-1 hover:text-orange-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.deadlineWithinDays && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
						Due within {filters.deadlineWithinDays} days
						<button
							type="button"
							onClick={() => onRemove('deadlineWithinDays')}
							className="ml-1 hover:text-orange-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.minFitScore && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
						Min Score: {filters.minFitScore}
						<button
							type="button"
							onClick={() => onRemove('minFitScore')}
							className="ml-1 hover:text-indigo-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.maxFitScore && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
						Max Score: {filters.maxFitScore}
						<button
							type="button"
							onClick={() => onRemove('maxFitScore')}
							className="ml-1 hover:text-indigo-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.sort !== 'FIT_DESC' && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-100 text-slate-800 rounded">
						Sort: {filters.sort.replace('_', ' ').toLowerCase()}
						<button
							type="button"
							onClick={() => onRemove('sort', 'FIT_DESC')}
							className="ml-1 hover:text-slate-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
				{filters.source && filters.source !== 'ALL' && (
					<span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
						Source: {filters.source}
						<button
							type="button"
							onClick={() => onRemove('source', 'ALL')}
							className="ml-1 hover:text-purple-600"
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				)}
			</div>
		</div>
	);
}
