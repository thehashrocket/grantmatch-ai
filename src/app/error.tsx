'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorPage({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
			<p className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-2">
				500
			</p>
			<h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Something went wrong
			</h1>
			<p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
				An unexpected error occurred. You can try again or visit our{' '}
				<Link
					href="/contact"
					className="text-blue-600 dark:text-blue-400 hover:underline"
				>
					contact page
				</Link>{' '}
				if the problem persists.
			</p>
			<div className="flex flex-wrap gap-3 justify-center">
				<button
					type="button"
					onClick={reset}
					className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
				>
					Try again
				</button>
				<Link
					href="/"
					className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					Go home
				</Link>
			</div>
		</div>
	);
}
