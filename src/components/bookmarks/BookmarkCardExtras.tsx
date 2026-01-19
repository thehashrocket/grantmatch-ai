// /src/components/bookmarks/BookmarkCardExtras.tsx

'use client';

import { ChevronDown } from 'lucide-react';
import { BookmarkMetaEditor } from '@/components/grants/BookmarkMetaEditor';
import { Badge } from '@/components/ui/badge';
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface BookmarkCardExtrasProps {
	grantId: string;
	initialNote?: string | null;
	initialTags?: string[];
	statusMapInput?: { grantIds: string[] };
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onSaved: () => void;
}

export function BookmarkCardExtras({
	grantId,
	initialNote,
	initialTags,
	statusMapInput,
	isOpen,
	onOpenChange,
	onSaved,
}: BookmarkCardExtrasProps) {
	const noteText = (initialNote ?? '').trim();
	const hasNote = noteText.length > 0;
	const tags = initialTags ?? [];
	const previewTags = tags.slice(0, 2);
	const extraTags = tags.length > previewTags.length ? tags.length - 2 : 0;
	const notePreview = hasNote
		? noteText.length > 40
			? `${noteText.slice(0, 40)}...`
			: noteText
		: '';

	return (
		<Collapsible open={isOpen} onOpenChange={onOpenChange}>
			<div className="rounded-md border">
				<CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-3 py-2 text-sm font-medium text-muted-foreground">
					<div className="flex flex-wrap items-center gap-2 text-left">
						<span>Notes & tags</span>
						{previewTags.map((tag) => (
							<Badge key={tag} variant="secondary">
								{tag}
							</Badge>
						))}
						{extraTags > 0 ? (
							<Badge variant="outline">+{extraTags} more</Badge>
						) : null}
						{notePreview ? (
							<span className="text-xs text-muted-foreground">
								Notes: &quot;{notePreview}&quot;
							</span>
						) : null}
					</div>
					<ChevronDown
						className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
					/>
				</CollapsibleTrigger>
				<CollapsibleContent
					className="border-t p-3 data-[state=closed]:hidden"
					forceMount
				>
					<BookmarkMetaEditor
						grantId={grantId}
						initialNote={initialNote}
						initialTags={initialTags}
						statusMapInput={statusMapInput}
						onSaved={onSaved}
						className="border-0 p-0"
					/>
				</CollapsibleContent>
			</div>
		</Collapsible>
	);
}
