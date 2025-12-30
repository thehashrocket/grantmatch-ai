interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  // Handle edge cases where total might be 0, undefined, or null
  const validTotal = total || 0;
  const validPageSize = pageSize || 1;
  const totalPages = Math.ceil(validTotal / validPageSize);
  
  // Don't show pagination if there's only one page or no results
  if (totalPages <= 1) {
    return null;
  }

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex justify-center gap-2 mt-6">
      <button
        type="button"
        className="px-3 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
        onClick={() => onPageChange(1)}
        disabled={isFirst}
        aria-label="First page"
      >
        First
      </button>
      <button
        type="button"
        className="px-3 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={isFirst}
        aria-label="Previous page"
      >
        Previous
      </button>
      <span className="self-center text-sm text-muted-foreground px-2">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="px-3 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={isLast}
        aria-label="Next page"
      >
        Next
      </button>
      <button
        type="button"
        className="px-3 py-2 rounded bg-muted text-muted-foreground disabled:opacity-50"
        onClick={() => onPageChange(totalPages)}
        disabled={isLast}
        aria-label="Last page"
      >
        Last
      </button>
    </div>
  );
} 
