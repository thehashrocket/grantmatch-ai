interface GrantResultsErrorProps {
	error: unknown;
	onRetry: () => void;
}

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	if (
		error &&
		typeof error === 'object' &&
		'message' in error &&
		typeof (error as { message: unknown }).message === 'string'
	) {
		return (error as { message: string }).message;
	}
	return 'An error occurred while loading grants.';
}

export function GrantResultsError({ error, onRetry }: GrantResultsErrorProps) {
	const message = getErrorMessage(error);
	return (
		<div className="text-center py-12" role="alert" aria-live="assertive">
			<h1 className="text-3xl font-bold text-gray-900 mb-4">
				Error Loading Grants
			</h1>
			<p className="text-gray-600 mb-4">{message}</p>
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
