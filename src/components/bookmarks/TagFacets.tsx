// /src/components/bookmarks/TagFacets.tsx

'use client';

import { BOOKMARK_STATUS_LABELS } from '@/lib/types/bookmark';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TagFacet {
	tag: string;
	count: number;
}

interface TagFacetsProps {
	tagFacets: TagFacet[];
	overflowFacets: TagFacet[];
	selectedTags: string[];
	tagMatchMode: 'ANY' | 'ALL';
	savedViewValue: string;
	onToggleTag: (tag: string) => void;
	onClearTags: () => void;
	onTagMatchModeChange: (value: 'ANY' | 'ALL') => void;
	onSavedViewChange: (value: string) => void;
}

export function TagFacets({
	tagFacets,
	overflowFacets,
	selectedTags,
	tagMatchMode,
	savedViewValue,
	onToggleTag,
	onClearTags,
	onTagMatchModeChange,
	onSavedViewChange,
}: TagFacetsProps) {
	const tagFilterId = 'bookmarked-grants-tag-filter';
	const tagModeId = 'bookmarked-grants-tag-mode';
	const savedViewId = 'bookmarked-grants-saved-view';

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-3">
				<Label
					className="text-sm font-medium text-muted-foreground"
					htmlFor={tagFilterId}
				>
					Tag facets
				</Label>
				<div className="flex flex-wrap gap-2" id={tagFilterId}>
					{tagFacets.length ? (
						tagFacets.map((facet) => {
							const isActive = selectedTags.includes(facet.tag);
							return (
								<Button
									key={facet.tag}
									variant={isActive ? 'secondary' : 'outline'}
									size="sm"
									onClick={() => onToggleTag(facet.tag)}
								>
									{facet.tag}
									<Badge variant="secondary" className="ml-2">
										{facet.count}
									</Badge>
								</Button>
							);
						})
					) : (
						<span className="text-sm text-muted-foreground">
							No tags yet. Add some from bookmark notes.
						</span>
					)}
					{overflowFacets.length > 0 && (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm">
									More...
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="start" className="w-48">
								{overflowFacets.map((facet) => {
									const isActive = selectedTags.includes(facet.tag);
									return (
										<DropdownMenuItem
											key={facet.tag}
											onClick={() => onToggleTag(facet.tag)}
										>
											<span className="flex-1">{facet.tag}</span>
											<span
												className={`text-xs ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
											>
												{facet.count}
											</span>
										</DropdownMenuItem>
									);
								})}
							</DropdownMenuContent>
						</DropdownMenu>
					)}
					{selectedTags.length > 0 && (
						<Button variant="ghost" size="sm" onClick={onClearTags}>
							Clear tags
						</Button>
					)}
				</div>
			</div>
			<div className="flex flex-wrap items-center gap-3">
				<Label
					className="text-sm font-medium text-muted-foreground"
					htmlFor={savedViewId}
				>
					Saved view
				</Label>
				<Select value={savedViewValue} onValueChange={onSavedViewChange}>
					<SelectTrigger
						className="w-[200px]"
						id={savedViewId}
						aria-labelledby={savedViewId}
					>
						<SelectValue placeholder="Saved views" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">All bookmarked</SelectItem>
						<SelectItem value="INTERESTED">
							{BOOKMARK_STATUS_LABELS.INTERESTED}
						</SelectItem>
						<SelectItem value="APPLIED">
							{BOOKMARK_STATUS_LABELS.APPLIED}
						</SelectItem>
						<SelectItem value="NOT_FOR_US">
							{BOOKMARK_STATUS_LABELS.NOT_FOR_US}
						</SelectItem>
						<SelectItem value="NEEDS_FOLLOW_UP">Needs follow-up</SelectItem>
						<SelectItem value="CUSTOM" disabled>
							Custom
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
			{selectedTags.length > 0 && (
				<div className="flex flex-wrap items-center gap-3">
					<Label
						className="text-sm font-medium text-muted-foreground"
						htmlFor={tagModeId}
					>
						Tag match
					</Label>
					<Select
						value={tagMatchMode}
						onValueChange={(value) =>
							onTagMatchModeChange(value as 'ANY' | 'ALL')
						}
					>
					<SelectTrigger
						className="w-[200px]"
						id={tagModeId}
						aria-labelledby={tagModeId}
					>
						<SelectValue placeholder="Match mode" />
					</SelectTrigger>
						<SelectContent>
							<SelectItem value="ANY">Match any selected tag</SelectItem>
							<SelectItem value="ALL">Match all selected tags</SelectItem>
						</SelectContent>
					</Select>
				</div>
			)}
		</div>
	);
}
