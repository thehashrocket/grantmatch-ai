import { GrantCard } from './GrantCard';
import { GrantResultsError } from './GrantResultsError';
import { GrantResultsSkeleton } from './GrantResultsSkeleton';
import { Pagination } from './Pagination';
import type { GrantMatch } from '@/lib/types/grant';
import type { BookmarkStatusRecord } from '@/lib/types/bookmark';
import { BookmarkButton } from './BookmarkButton';
import { BookmarkStatusSelect } from './BookmarkStatusSelect';
import { BookmarkQuickTagMenu } from './BookmarkQuickTagMenu';

interface GrantResultsProps {
	grants: GrantMatch[] | undefined;
	isLoading: boolean;
	error?: unknown;
	onRetry?: () => void;
	page?: number;
	pageSize?: number;
	total?: number;
	onPageChange?: (page: number) => void;
	bookmarkStatusMap?: Record<string, BookmarkStatusRecord>;
	statusMapInput?: { grantIds: string[] };
	returnTo?: string;
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
	bookmarkStatusMap,
	statusMapInput,
	returnTo,
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
					<GrantCard
						key={grant.id}
						grant={grant}
						returnTo={returnTo}
						actionSlot={
							<div className="flex items-start gap-2">
								<div className="flex flex-col items-end gap-2">
									{statusMapInput ? (
										<BookmarkButton
											grantId={grant.id}
											isBookmarked={Boolean(bookmarkStatusMap?.[grant.id])}
											status={bookmarkStatusMap?.[grant.id]?.status}
											statusMapInput={statusMapInput}
										/>
									) : null}
									{bookmarkStatusMap?.[grant.id] ? (
										<BookmarkStatusSelect
											grantId={grant.id}
											status={bookmarkStatusMap[grant.id]?.status}
											statusMapInput={statusMapInput}
										/>
									) : null}
								</div>
								{bookmarkStatusMap?.[grant.id] && statusMapInput ? (
									<BookmarkQuickTagMenu
										grantId={grant.id}
										currentTags={bookmarkStatusMap[grant.id]?.tags}
										statusMapInput={statusMapInput}
									/>
								) : null}
							</div>
						}
					/>
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
