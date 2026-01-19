// /src/components/bookmarks/BookmarkCardExtras.tsx

'use client';

import { BookmarkMetaEditor } from '@/components/grants/BookmarkMetaEditor';

interface BookmarkCardExtrasProps {
	grantId: string;
	initialNote?: string | null;
	initialTags?: string[];
	statusMapInput?: { grantIds: string[] };
}

export function BookmarkCardExtras({
	grantId,
	initialNote,
	initialTags,
	statusMapInput,
}: BookmarkCardExtrasProps) {
	return (
		<BookmarkMetaEditor
			grantId={grantId}
			initialNote={initialNote}
			initialTags={initialTags}
			statusMapInput={statusMapInput}
		/>
	);
}
