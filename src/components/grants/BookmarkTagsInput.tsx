'use client';

import { useEffect, useMemo, useState } from 'react';
import { Tag } from 'lucide-react';
import { trpc } from '@/lib/trpc/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BookmarkTagsInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	disabled?: boolean;
}

const sanitizeTag = (tag: string) =>
	tag.replace(/\s+/g, ' ').trim().toLowerCase();

export function BookmarkTagsInput({
	tags,
	onChange,
	disabled = false,
}: BookmarkTagsInputProps) {
	const [input, setInput] = useState('');
	const [isOpen, setIsOpen] = useState(false);
	const [frozenSuggestions, setFrozenSuggestions] = useState<
		{ tag: string; count: number; lastUsedAt?: Date | string | null }[]
	>([]);
	const { data: tagSummary } = trpc.bookmark.getMyTags.useQuery(undefined, {
		refetchOnWindowFocus: false,
	});

	const baseSuggestions = useMemo(() => {
		return (tagSummary ?? [])
			.filter((t) => !tags.includes(t.tag))
			.sort((a, b) => {
				const aTime = a.lastUsedAt ? new Date(a.lastUsedAt).getTime() : 0;
				const bTime = b.lastUsedAt ? new Date(b.lastUsedAt).getTime() : 0;
				if (bTime !== aTime) return bTime - aTime;
				if (b.count !== a.count) return b.count - a.count;
				return a.tag.localeCompare(b.tag);
			});
	}, [tagSummary, tags]);

	useEffect(() => {
		if (disabled && isOpen) {
			setIsOpen(false);
			setFrozenSuggestions([]);
		}
	}, [disabled, isOpen]);

	const suggestions = useMemo(() => {
		const needle = input.trim().toLowerCase();
		const source =
			isOpen && frozenSuggestions.length > 0
				? frozenSuggestions
				: baseSuggestions;
		const filtered = source.filter((t) =>
			needle ? t.tag.includes(needle) : true,
		);
		return filtered.slice(0, 8);
	}, [baseSuggestions, frozenSuggestions, input, isOpen]);

	const commitTag = (raw: string) => {
		const tag = sanitizeTag(raw);
		if (!tag) return;
		if (tag.length > 30) {
			setInput(tag.slice(0, 30));
			return;
		}
		if (tags.includes(tag)) {
			setInput('');
			return;
		}
		if (tags.length >= 10) return;
		onChange([...tags, tag]);
		setInput('');
	};

	const removeTag = (tag: string) => {
		onChange(tags.filter((t) => t !== tag));
	};

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-2">
				{tags.map((tag) => (
					<Badge
						key={tag}
						variant="secondary"
						className="flex items-center gap-1"
					>
						<Tag className="h-3 w-3" />
						<span>{tag}</span>
						<button
							type="button"
							onClick={() => removeTag(tag)}
							className="rounded p-0.5 hover:bg-muted"
							aria-label={`Remove tag ${tag}`}
							disabled={disabled}
						>
							×
						</button>
					</Badge>
				))}
			</div>
			<div className="relative">
				<Input
					placeholder="Add tag…"
					value={input}
					disabled={disabled}
					onChange={(event) => setInput(event.target.value)}
					onFocus={() => {
						setIsOpen(true);
						setFrozenSuggestions(baseSuggestions);
					}}
					onKeyDown={(event) => {
						if (event.key === 'Enter' || event.key === ',') {
							event.preventDefault();
							commitTag(input);
						} else if (event.key === 'Backspace' && input.length === 0) {
							const last = tags[tags.length - 1];
							if (last) removeTag(last);
						}
					}}
					onBlur={() => {
						setTimeout(() => {
							setIsOpen(false);
							setFrozenSuggestions([]);
						}, 50);
						if (input.trim()) commitTag(input);
					}}
				/>
				{isOpen && suggestions.length > 0 && (
					<div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
						<ul className="max-h-48 overflow-auto p-1">
							{suggestions.map((suggestion) => (
								<li key={suggestion.tag}>
									<button
										type="button"
										className={cn(
											'flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm hover:bg-accent',
										)}
										onMouseDown={(event) => event.preventDefault()}
										onClick={() => commitTag(suggestion.tag)}
									>
										<span>{suggestion.tag}</span>
										{suggestion.count > 0 && (
											<span className="text-xs text-muted-foreground">
												{suggestion.count}
											</span>
										)}
									</button>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
}

export { sanitizeTag };
