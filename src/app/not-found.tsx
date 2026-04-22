import Link from 'next/link';

export default function NotFound() {
	return (
		<div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
			<p className="text-6xl font-bold text-gray-200 dark:text-gray-800 mb-2">
				404
			</p>
			<h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
				Page not found
			</h1>
			<p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md">
				This page doesn't exist or may have moved. Try browsing open grants or
				return to the home page.
			</p>
			<div className="flex flex-wrap gap-3 justify-center">
				<Link
					href="/"
					className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
				>
					Go home
				</Link>
				<Link
					href="/grants"
					className="px-5 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
				>
					Browse grants
				</Link>
			</div>
		</div>
	);
}
