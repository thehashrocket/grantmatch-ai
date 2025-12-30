'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X } from 'lucide-react';
import type { GrantSearchFilters } from '@/lib/types/grant';

interface GrantSearchFormProps {
  onSearch: (filters: GrantSearchFilters) => void;
  onClear: () => void;
  isLoading?: boolean;
}

export function GrantSearchForm({ onSearch, onClear, isLoading }: GrantSearchFormProps) {
  const [filters, setFilters] = useState<GrantSearchFilters>({
    textSearch: '',
    minFunding: '',
    maxFunding: '',
    minDeadline: '',
    maxDeadline: '',
    minFitScore: '',
    maxFitScore: '',
    source: 'ALL',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleInputChange = (field: keyof GrantSearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    onSearch(filters);
  };

  const handleClear = () => {
    setFilters({
      textSearch: '',
      minFunding: '',
      maxFunding: '',
      minDeadline: '',
      maxDeadline: '',
      minFitScore: '',
      maxFitScore: '',
      source: 'ALL',
    });
    onClear();
  };

  // Only count as active if not empty and not the default for source
  const hasActiveFilters = (
    filters.textSearch !== '' ||
    filters.minFunding !== '' ||
    filters.maxFunding !== '' ||
    filters.minDeadline !== '' ||
    filters.maxDeadline !== '' ||
    filters.minFitScore !== '' ||
    filters.maxFitScore !== '' ||
    (filters.source && filters.source !== 'ALL')
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Grants
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {isExpanded ? 'Hide' : 'Show'} Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
                disabled={isLoading}
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Search */}
        <div className="space-y-2">
          <Label htmlFor="textSearch">Search in titles and descriptions</Label>
          <div className="flex gap-2">
            <Input
              id="textSearch"
              placeholder="Enter keywords..."
              value={filters.textSearch}
              onChange={(e) => handleInputChange('textSearch', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isLoading}>
              Search
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Funding Range */}
            <div className="space-y-2">
              <Label>Funding Amount</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min $"
                  value={filters.minFunding}
                  onChange={(e) => handleInputChange('minFunding', e.target.value)}
                  type="number"
                />
                <Input
                  placeholder="Max $"
                  value={filters.maxFunding}
                  onChange={(e) => handleInputChange('maxFunding', e.target.value)}
                  type="number"
                />
              </div>
            </div>

            {/* Deadline Range */}
            <div className="space-y-2">
              <Label>Application Deadline</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="From"
                  value={filters.minDeadline}
                  onChange={(e) => handleInputChange('minDeadline', e.target.value)}
                  type="date"
                />
                <Input
                  placeholder="To"
                  value={filters.maxDeadline}
                  onChange={(e) => handleInputChange('maxDeadline', e.target.value)}
                  type="date"
                />
              </div>
            </div>

            {/* Fit Score Range */}
            <div className="space-y-2">
              <Label>Fit Score</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Min"
                  value={filters.minFitScore}
                  onChange={(e) => handleInputChange('minFitScore', e.target.value)}
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                />
                <Input
                  placeholder="Max"
                  value={filters.maxFitScore}
                  onChange={(e) => handleInputChange('maxFitScore', e.target.value)}
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                />
              </div>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <Label>Grant Source</Label>
              <Select value={filters.source} onValueChange={(value: string) => handleInputChange('source', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All sources</SelectItem>
                  <SelectItem value="CALIFORNIA">California</SelectItem>
                  <SelectItem value="FEDERAL">Federal</SelectItem>
                  <SelectItem value="OHIO">Ohio</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Active Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {filters.textSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  Search: &ldquo;{filters.textSearch}&rdquo;
                  <button
                    type="button"
                    onClick={() => handleInputChange('textSearch', '')}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.minFunding && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Min: ${filters.minFunding}
                  <button
                    type="button"
                    onClick={() => handleInputChange('minFunding', '')}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxFunding && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                  Max: ${filters.maxFunding}
                  <button
                    type="button"
                    onClick={() => handleInputChange('maxFunding', '')}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.minDeadline && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                  From: {new Date(filters.minDeadline).toLocaleDateString()}
                  <button
                    type="button"
                    onClick={() => handleInputChange('minDeadline', '')}
                    className="ml-1 hover:text-orange-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxDeadline && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-orange-100 text-orange-800 rounded">
                  To: {new Date(filters.maxDeadline).toLocaleDateString()}
                  <button
                    type="button"
                    onClick={() => handleInputChange('maxDeadline', '')}
                    className="ml-1 hover:text-orange-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.minFitScore && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                  Min Score: {filters.minFitScore}
                  <button
                    type="button"
                    onClick={() => handleInputChange('minFitScore', '')}
                    className="ml-1 hover:text-indigo-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.maxFitScore && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-800 rounded">
                  Max Score: {filters.maxFitScore}
                  <button
                    type="button"
                    onClick={() => handleInputChange('maxFitScore', '')}
                    className="ml-1 hover:text-indigo-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filters.source && filters.source !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded">
                  Source: {filters.source}
                  <button
                    type="button"
                    onClick={() => handleInputChange('source', 'ALL')}
                    className="ml-1 hover:text-purple-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 
