'use client';

import { useState } from 'react';
import { Loader2, MoreVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { sanitizeTag } from '@/components/grants/BookmarkTagsInput';

interface BookmarkQuickTagMenuProps {
	grantId: string;
	currentTags?: string[];
	statusMapInput: { grantIds: string[] };
}

export function BookmarkQuickTagMenu({
	grantId,
	currentTags = [],
	statusMapInput,
}: BookmarkQuickTagMenuProps) {
	const utils = trpc.useUtils();
	const [tagInput, setTagInput] = useState('');

	const mutation = trpc.bookmark.updateMeta.useMutation({
		onMutate: async (variables) => {
			await utils.bookmark.statusMap.cancel(statusMapInput);
			const previous = utils.bookmark.statusMap.getData(statusMapInput);
			utils.bookmark.statusMap.setData(statusMapInput, (current) => {
				const next = { ...(current ?? {}) };
				const existing = current?.[variables.grantId];
				if (existing) {
					next[variables.grantId] = {
						...existing,
						tags: variables.tags ?? existing.tags ?? [],
					};
				}
				return next;
			});
			return { previous };
		},
		onSuccess: () => {
			setTagInput('');
		},
		onError: (error, _variables, context) => {
			if (context?.previous) {
				utils.bookmark.statusMap.setData(statusMapInput, context.previous);
			}
			if (
				(error as { data?: { code?: string } })?.data?.code === 'UNAUTHORIZED'
			) {
				toast.error('Your session expired — please sign in again.');
			} else if (error.message === 'TAG_LIMIT_EXCEEDED') {
				toast.error('You can add up to 10 tags per bookmark.');
			} else if (error.message === 'TAG_TOO_LONG') {
				toast.error('Tags must be 30 characters or less.');
			} else {
				toast.error('Could not add tag. Please try again.');
			}
		},
		onSettled: () => {
			utils.bookmark.list.invalidate();
			utils.bookmark.getMyTags.invalidate();
			utils.bookmark.statusMap.invalidate(statusMapInput);
		},
	});

	const handleAddTag = () => {
		const normalized = sanitizeTag(tagInput);
		if (!normalized) {
			setTagInput('');
			return;
		}
		if (normalized.length > 30) {
			setTagInput(normalized.slice(0, 30));
			toast.error('Tags must be 30 characters or less.');
			return;
		}
		if (currentTags.includes(normalized)) {
			setTagInput('');
			return;
		}
		if (currentTags.length >= 10) {
			toast.error('You can add up to 10 tags per bookmark.');
			return;
		}

		mutation.mutate({
			grantId,
			tags: [...currentTags, normalized],
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					size="icon"
					variant="ghost"
					className="h-9 w-9"
					aria-label="More actions"
				>
					<MoreVertical className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64 space-y-2 p-3">
				<div className="text-xs font-medium text-muted-foreground">Add tag</div>
				<div className="flex items-center gap-2">
					<Input
						placeholder="Add tag…"
						value={tagInput}
						onChange={(event) => setTagInput(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') {
								event.preventDefault();
								handleAddTag();
							}
						}}
						disabled={mutation.isPending || currentTags.length >= 10}
					/>
					<Button
						size="icon"
						variant="secondary"
						onClick={handleAddTag}
						disabled={mutation.isPending || currentTags.length >= 10}
						aria-label="Add tag"
					>
						{mutation.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Plus className="h-4 w-4" />
						)}
					</Button>
				</div>
				{currentTags.length >= 10 ? (
					<p className="text-xs text-muted-foreground">
						Tag limit reached (10). Remove one before adding another.
					</p>
				) : (
					<p className="text-xs text-muted-foreground">
						Quickly tag this bookmark while browsing results.
					</p>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
