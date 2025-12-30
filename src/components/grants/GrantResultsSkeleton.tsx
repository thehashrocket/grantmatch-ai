import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function GrantResultsSkeleton({ count = 4 }: { count?: number }) {
	return (
		<div className="grid gap-4 md:grid-cols-2">
			{Array.from({ length: count }).map((_, i) => (
				<Card key={i} className="animate-pulse">
					<CardHeader className="space-y-2">
						<div className="h-4 w-2/3 bg-muted rounded" />
						<div className="h-3 w-1/4 bg-muted rounded" />
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="h-20 bg-muted rounded" />
						<div className="h-4 w-1/2 bg-muted rounded" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}
