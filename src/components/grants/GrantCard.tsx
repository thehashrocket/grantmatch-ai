import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getFitScoreCategory, getFitScoreColor, type GrantMatch } from '@/lib/types/grant';
import { ExternalLink } from 'lucide-react';

interface GrantCardProps {
  grant: GrantMatch;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function GrantCard({ grant }: GrantCardProps) {
  const category = getFitScoreCategory(grant.fitScore);
  const colorClasses = getFitScoreColor(category);
  
  return (
    <Card className="transition-shadow hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">
              <Link 
                href={grant.internalUrl}
                className="hover:underline"
              >
                {grant.title}
              </Link>
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses}`}>
                Fit Score: {grant.fitScore.toFixed(1)}
              </span>
              <a
                href={grant.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                <span>View Original</span>
              </a>
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="font-semibold">{formatCurrency(grant.fundingAmount)}</div>
            <div className="text-sm text-muted-foreground">
              Due {formatDate(grant.deadline)}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{grant.explanation}</p>
      </CardContent>
    </Card>
  );
} 