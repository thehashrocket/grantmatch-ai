'use client';

import { useMemo } from 'react';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import type { BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import { Button } from '@/components/ui/button';

interface BookmarkButtonProps {
	grantId: string;
	status?: BookmarkStatus;
	isBookmarked?: boolean;
	statusMapInput: { grantIds: string[] };
}

export function BookmarkButton({
	grantId,
	status,
	isBookmarked = false,
	statusMapInput,
}: BookmarkButtonProps) {
	const utils = trpc.useUtils();

	const toggleMutation = trpc.bookmark.toggle.useMutation({
		onMutate: async () => {
			if (!statusMapInput) return;
			await utils.bookmark.statusMap.cancel(statusMapInput);
			const previous = utils.bookmark.statusMap.getData(statusMapInput);

			utils.bookmark.statusMap.setData(statusMapInput, (current) => {
				const next = { ...(current ?? {}) };
				if (isBookmarked) {
					delete next[grantId];
				} else {
					const existingTags = current?.[grantId]?.tags ?? [];
					next[grantId] = {
						isBookmarked: true,
						status: 'INTERESTED',
						tags: existingTags,
					};
				}
				return next;
			});

			return { previous };
		},
		onError: (error, _variables, context) => {
			if (statusMapInput && context?.previous) {
				utils.bookmark.statusMap.setData(statusMapInput, context.previous);
			}
			if (
				(error as { data?: { code?: string } })?.data?.code === 'UNAUTHORIZED'
			) {
				toast.error('Your session expired — please sign in again.');
			} else if (error.message === 'BOOKMARK_LIMIT_REACHED') {
				toast.error('Bookmark limit reached (100). Remove one before adding.');
			} else {
				toast.error('Could not update bookmark. Please try again.');
			}
		},
		onSettled: () => {
			if (statusMapInput) {
				utils.bookmark.statusMap.invalidate(statusMapInput);
			}
			utils.bookmark.list.invalidate();
		},
	});

	const handleToggle = () => {
		if (toggleMutation.isPending) return;
		toggleMutation.mutate({ grantId });
	};

	const label = useMemo(() => {
		if (toggleMutation.isPending) return 'Saving...';
		if (isBookmarked) return 'Bookmarked';
		return 'Bookmark';
	}, [isBookmarked, toggleMutation.isPending]);

	return (
		<Button
			type="button"
			variant={isBookmarked ? 'secondary' : 'outline'}
			size="sm"
			onClick={handleToggle}
			aria-pressed={isBookmarked}
			disabled={toggleMutation.isPending}
		>
			{toggleMutation.isPending ? (
				<Loader2 className="animate-spin" />
			) : isBookmarked ? (
				<BookmarkCheck className="stroke-green-600 dark:stroke-green-300" />
			) : (
				<Bookmark />
			)}
			<span>{label}</span>
			{isBookmarked && status ? (
				<span className="text-xs text-muted-foreground">
					({BOOKMARK_STATUS_LABELS[status]})
				</span>
			) : null}
		</Button>
	);
}
