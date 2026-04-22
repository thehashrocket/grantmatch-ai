import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Contact Us | GrantMatch AI',
	description: 'Get in touch with the GrantMatch AI team.',
	alternates: { canonical: 'https://aigrantmatch.com/contact' },
};

export default function ContactPage() {
	return (
		<div className="max-w-2xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
				Contact Us
			</h1>
			<p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
				Have a question or feedback? We'd love to hear from you.
			</p>
			<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 space-y-6">
				<div>
					<h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
						Email
					</h2>
					<a
						href="mailto:hello@aigrantmatch.com"
						className="text-blue-600 dark:text-blue-400 hover:underline"
					>
						hello@aigrantmatch.com
					</a>
				</div>
				<div>
					<h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
						For Grant Organizations
					</h2>
					<p className="text-gray-600 dark:text-gray-400 text-sm">
						If you manage a grant program and would like it included in our
						platform, please reach out at the email above.
					</p>
				</div>
				<div>
					<h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-1">
						Support
					</h2>
					<p className="text-gray-600 dark:text-gray-400 text-sm">
						Existing users can reach our support team through the in-app help
						menu after signing in.
					</p>
				</div>
			</div>
		</div>
	);
}
