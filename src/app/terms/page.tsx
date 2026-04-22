import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Terms of Service | GrantMatch AI',
	description: 'Terms and conditions for using GrantMatch AI.',
	alternates: { canonical: 'https://aigrantmatch.com/terms' },
};

export default function TermsPage() {
	return (
		<div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Terms of Service
			</h1>
			<div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-6">
				<p>
					<strong>Last updated:</strong> April 2026
				</p>
				<p>
					By using GrantMatch AI ("Service"), you agree to these terms. Please
					read them carefully.
				</p>
				<h2 className="text-xl font-semibold mt-8">Use of the Service</h2>
				<p>
					GrantMatch AI provides grant discovery and matching services for
					nonprofit organizations. You agree to use the Service only for lawful
					purposes and in accordance with these Terms.
				</p>
				<h2 className="text-xl font-semibold mt-8">Accounts</h2>
				<p>
					You are responsible for maintaining the security of your account and
					for all activities that occur under your account. Notify us immediately
					of any unauthorized use.
				</p>
				<h2 className="text-xl font-semibold mt-8">Accuracy of Information</h2>
				<p>
					Grant information is aggregated from public sources. We strive for
					accuracy but cannot guarantee that all grant details are current or
					complete. Always verify grant requirements with the funding organization
					directly.
				</p>
				<h2 className="text-xl font-semibold mt-8">Limitation of Liability</h2>
				<p>
					GrantMatch AI is provided "as is." We are not liable for any indirect,
					incidental, or consequential damages arising from your use of the
					Service.
				</p>
				<h2 className="text-xl font-semibold mt-8">Contact</h2>
				<p>
					Questions about these terms? Visit our{' '}
					<a href="/contact">contact page</a>.
				</p>
			</div>
		</div>
	);
}
