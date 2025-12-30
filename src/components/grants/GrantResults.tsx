import { GrantCard } from './GrantCard';
import { GrantResultsError } from './GrantResultsError';
import { GrantResultsSkeleton } from './GrantResultsSkeleton';
import { Pagination } from './Pagination';
import type { GrantMatch } from '@/lib/types/grant';

interface GrantResultsProps {
	grants: GrantMatch[] | undefined;
	isLoading: boolean;
	error?: unknown;
	onRetry?: () => void;
	page?: number;
	pageSize?: number;
	total?: number;
	onPageChange?: (page: number) => void;
}

export function GrantResults({
	grants,
	isLoading,
	error,
	onRetry = () => {},
	page = 1,
	pageSize = 10,
	total,
	onPageChange,
}: GrantResultsProps) {
	if (isLoading) {
		return <GrantResultsSkeleton />;
	}

	if (error !== undefined && error !== null) {
		return <GrantResultsError error={error} onRetry={onRetry} />;
	}

	if (!grants || grants.length === 0) {
		return (
			<p className="text-center py-12 text-muted-foreground" aria-live="polite">
				No grants found.
			</p>
		);
	}

	// Use total from props or fall back to grants length
	const totalCount = total ?? grants.length;

	return (
		<>
			<div className="grid gap-4 md:grid-cols-2">
				{grants.map((grant) => (
					<GrantCard key={grant.id} grant={grant} />
				))}
			</div>
			{onPageChange && (
				<Pagination
					page={page}
					pageSize={pageSize}
					total={totalCount}
					onPageChange={onPageChange}
				/>
			)}
		</>
	);
}
