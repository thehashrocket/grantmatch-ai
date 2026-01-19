// /src/components/grants/BookmarkMetaEditor.tsx

'use client';

import { useEffect, useMemo, useState, useRef } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BookmarkTagsInput } from '@/components/grants/BookmarkTagsInput';
import { Tag } from 'lucide-react';

interface BookmarkMetaEditorProps {
	grantId: string;
	initialNote?: string | null;
	initialTags?: string[];
	statusMapInput?: { grantIds: string[] };
}

const MAX_NOTE_LENGTH = 2000;

const normalizeNote = (value: string) => {
	const trimmed = value.trim();
	return trimmed.length ? trimmed : null;
};

const tagsEqual = (a: string[], b: string[]) =>
	a.length === b.length && a.every((tag, index) => tag === b[index]);

export function BookmarkMetaEditor({
	grantId,
	initialNote,
	initialTags,
	statusMapInput,
}: BookmarkMetaEditorProps) {
	const utils = trpc.useUtils();
	const [note, setNote] = useState(initialNote ?? '');
	const [tags, setTags] = useState<string[]>(initialTags ?? []);
	const savedTimerRef = useRef<number | null>(null);
	const [lastSaved, setLastSaved] = useState<{
		note: string | null;
		tags: string[];
	}>({
		note: initialNote ?? null,
		tags: initialTags ?? [],
	});
	const [saveState, setSaveState] = useState<
		'idle' | 'saving' | 'saved' | 'error'
	>('idle');
	const [isDirty, setIsDirty] = useState(false);
	const noteInputId = `${grantId}-note-input`;

	useEffect(() => {
		if (isDirty) return;
		setNote(initialNote ?? '');
		setTags(initialTags ?? []);
		setLastSaved({
			note: initialNote ?? null,
			tags: initialTags ?? [],
		});
	}, [initialNote, initialTags, isDirty]);

	useEffect(() => {
		const normalizedNote = normalizeNote(note);
		const noteChanged = normalizedNote !== lastSaved.note;
		const tagsChanged = !tagsEqual(tags, lastSaved.tags);
		setIsDirty(noteChanged || tagsChanged);
	}, [note, tags, lastSaved]);

	useEffect(() => {
		return () => {
			if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
		};
	}, []);

	const mutation = trpc.bookmark.updateMeta.useMutation({
		onSuccess: (data) => {
			setTags(data.tags ?? []);
			setNote(data.note ?? '');
			setLastSaved({
				note: data.note ?? null,
				tags: data.tags ?? [],
			});
			setIsDirty(false);
			setSaveState('saved');
			if (savedTimerRef.current) window.clearTimeout(savedTimerRef.current);
			savedTimerRef.current = window.setTimeout(
				() => setSaveState((s) => (s === 'saved' ? 'idle' : s)),
				1500,
			);

			utils.bookmark.list.invalidate();
			utils.bookmark.getMyTags.invalidate();
			if (statusMapInput) {
				utils.bookmark.statusMap.invalidate(statusMapInput);
			}
		},
		onError: (error) => {
			setSaveState('error');
			if (
				(error as { data?: { code?: string } })?.data?.code === 'UNAUTHORIZED'
			) {
				toast.error('Your session expired — please sign in again.');
			} else {
				toast.error('Could not save bookmark details. Please try again.');
			}
		},
		onSettled: () => {
			setSaveState((prev) => (prev === 'saving' ? 'idle' : prev));
		},
	});

	const noteTooLong = useMemo(() => note.length > MAX_NOTE_LENGTH, [note]);

	const handleSave = (nextNote: string, nextTags: string[]) => {
		if (mutation.isPending) return; // prevent overlapping saves
		setSaveState('saving');
		mutation.mutate({ grantId, note: normalizeNote(nextNote), tags: nextTags });
	};

	const handleNoteBlur = () => {
		if (noteTooLong) {
			toast.error('Notes must be 2000 characters or less.');
			return;
		}
		if (!isDirty) return;
		handleSave(note, tags);
	};

	const handleTagsChange = (nextTags: string[]) => {
		if (tagsEqual(nextTags, tags)) return;
		setTags(nextTags);
		handleSave(note, nextTags);
	};

	return (
		<div className="space-y-3 rounded-md border p-3">
			<div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
				<Tag className="h-4 w-4" />
				<span>Bookmark notes & tags</span>
			</div>

			<BookmarkTagsInput
				tags={tags}
				onChange={handleTagsChange}
				disabled={mutation.isPending}
			/>

			<div className="space-y-2">
				<Label
					className="text-xs font-medium text-muted-foreground"
					htmlFor={noteInputId}
				>
					Notes (max 2000 characters)
				</Label>
				<Textarea
					id={noteInputId}
					value={note}
					onChange={(event) => setNote(event.target.value)}
					onBlur={handleNoteBlur}
					placeholder="Add notes about this grant"
					className={noteTooLong ? 'border-destructive' : undefined}
				/>
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<span>
						{note.length}/{MAX_NOTE_LENGTH}
					</span>
					{noteTooLong ? (
						<span className="text-destructive">Too long</span>
					) : saveState === 'saving' ? (
						<span>Saving…</span>
					) : saveState === 'saved' ? (
						<span className="text-green-600 dark:text-green-300">Saved</span>
					) : saveState === 'error' ? (
						<span className="text-destructive">Couldn&apos;t save</span>
					) : null}
				</div>
				{saveState === 'error' && (
					<div className="flex items-center gap-3 text-xs text-destructive">
						<span>Couldn&apos;t save.</span>
						<button
							type="button"
							className="underline"
							onClick={() => handleSave(note, tags)}
							disabled={mutation.isPending}
						>
							Retry
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
