// /src/components/bookmarks/BulkActionBar.tsx

'use client';

import { useState } from 'react';
import { Check, Tags, Trash2 } from 'lucide-react';
import type { BookmarkStatus } from '@/lib/types/bookmark';
import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { sanitizeTag } from '@/components/grants/BookmarkTagsInput';

interface BulkActionBarProps {
	selectedCount: number;
	allSelected: boolean;
	onSelectAll: () => void;
	onClearSelection: () => void;
	onSetStatus: (status: BookmarkStatus) => void;
	onAddTag: (tag: string) => void;
	onRemove: () => void;
	isPending: boolean;
}

export function BulkActionBar({
	selectedCount,
	allSelected,
	onSelectAll,
	onClearSelection,
	onSetStatus,
	onAddTag,
	onRemove,
	isPending,
}: BulkActionBarProps) {
	const [tagInput, setTagInput] = useState('');

	if (selectedCount === 0) return null;

	const handleAddTag = () => {
		const normalized = sanitizeTag(tagInput);
		if (!normalized) {
			setTagInput('');
			return;
		}
		onAddTag(normalized);
		setTagInput('');
	};

	return (
		<div className="sticky top-4 z-10 rounded-md border bg-background/95 p-3 shadow-sm backdrop-blur">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="text-sm text-muted-foreground">
					{selectedCount} selected
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" size="sm" onClick={onSelectAll}>
						{allSelected ? 'Clear page' : 'Select all on page'}
					</Button>
					<Button variant="ghost" size="sm" onClick={onClearSelection}>
						Clear selection
					</Button>
					<Select
						onValueChange={(value) => onSetStatus(value as BookmarkStatus)}
						disabled={isPending}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Set status" />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(BOOKMARK_STATUS_LABELS) as BookmarkStatus[]).map(
								(status) => (
									<SelectItem key={status} value={status}>
										<div className="flex items-center gap-2">
											<Check className="h-4 w-4" />
											{BOOKMARK_STATUS_LABELS[status]}
										</div>
									</SelectItem>
								),
							)}
						</SelectContent>
					</Select>
					<div className="flex items-center gap-2">
						<Input
							placeholder="Add tag"
							value={tagInput}
							onChange={(event) => setTagInput(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === 'Enter') {
									event.preventDefault();
									handleAddTag();
								}
							}}
							className="w-[160px]"
							disabled={isPending}
						/>
						<Button
							variant="secondary"
							size="sm"
							onClick={handleAddTag}
							disabled={isPending}
						>
							<Tags className="mr-1 h-4 w-4" />
							Add tag
						</Button>
					</div>
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button variant="destructive" size="sm" disabled={isPending}>
								<Trash2 className="mr-1 h-4 w-4" />
								Remove
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Remove bookmarks?</AlertDialogTitle>
								<AlertDialogDescription>
									This removes {selectedCount} bookmarks from your list.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={onRemove}>Remove</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>
		</div>
	);
}
