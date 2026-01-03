'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import type { BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

interface BookmarkStatusSelectProps {
	grantId: string;
	status?: BookmarkStatus;
	statusMapInput?: { grantIds: string[] };
}

export function BookmarkStatusSelect({
	grantId,
	status,
	statusMapInput,
}: BookmarkStatusSelectProps) {
	const utils = trpc.useUtils();

	const mutation = trpc.bookmark.setStatus.useMutation({
		onMutate: async (variables) => {
			if (!statusMapInput) return;
			await utils.bookmark.statusMap.cancel(statusMapInput);
			const previous = utils.bookmark.statusMap.getData(statusMapInput);

			utils.bookmark.statusMap.setData(statusMapInput, (current) => {
				const next = { ...(current ?? {}) };
				const existingTags = current?.[variables.grantId]?.tags ?? [];
				next[variables.grantId] = {
					isBookmarked: true,
					status: variables.status,
					tags: existingTags,
				};
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
			} else {
				toast.error('Could not update status. Please try again.');
			}
		},
		onSettled: () => {
			if (statusMapInput) {
				utils.bookmark.statusMap.invalidate(statusMapInput);
			}
			utils.bookmark.list.invalidate();
		},
	});

	return (
		<Select
			value={status ?? 'INTERESTED'}
			onValueChange={(value) =>
				mutation.mutate({ grantId, status: value as BookmarkStatus })
			}
		>
			<SelectTrigger
				className="w-[200px] justify-between"
				aria-label="Bookmark status"
			>
				<SelectValue
					placeholder="Bookmark status"
					aria-live="polite"
					aria-busy={mutation.isPending}
				>
					<div className="flex items-center gap-2">
						<span className="text-sm">
							{BOOKMARK_STATUS_LABELS[status ?? 'INTERESTED']}
						</span>
						{mutation.isPending && (
							<ChevronsUpDown className="h-3.5 w-3.5 animate-pulse" />
						)}
					</div>
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{(Object.keys(BOOKMARK_STATUS_LABELS) as BookmarkStatus[]).map(
					(value) => (
						<SelectItem key={value} value={value}>
							<div className="flex items-center gap-2">
								<Check
									className={
										status === value
											? 'h-4 w-4 opacity-100'
											: 'h-4 w-4 opacity-0'
									}
								/>
								<span>{BOOKMARK_STATUS_LABELS[value]}</span>
							</div>
						</SelectItem>
					),
				)}
			</SelectContent>
		</Select>
	);
}
