import React from 'react';

interface GrantResultsErrorProps {
  error: any;
  onRetry: () => void;
}

export function GrantResultsError({ error, onRetry }: GrantResultsErrorProps) {
  return (
    <div className="text-center py-12" role="alert" aria-live="assertive">
      <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Loading Grants</h1>
      <p className="text-gray-600 mb-4">{error.message || 'An error occurred while loading grants.'}</p>
      <button
        type="button"
        className="inline-flex items-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 focus:outline-none focus:ring"
        onClick={onRetry}
      >
        Retry
      </button>
    </div>
  );
} 