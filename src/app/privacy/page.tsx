import type { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Privacy Policy | GrantMatch AI',
	description: 'How GrantMatch AI collects, uses, and protects your information.',
	alternates: { canonical: 'https://aigrantmatch.com/privacy' },
};

export default function PrivacyPage() {
	return (
		<div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
			<h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
				Privacy Policy
			</h1>
			<div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 space-y-6">
				<p>
					<strong>Last updated:</strong> April 2026
				</p>
				<p>
					GrantMatch AI ("we," "us," or "our") operates{' '}
					<a href="https://aigrantmatch.com">aigrantmatch.com</a>. This page
					describes how we collect, use, and protect information when you use our
					service.
				</p>
				<h2 className="text-xl font-semibold mt-8">Information We Collect</h2>
				<p>
					We collect information you provide directly, such as your name, email
					address, and organization details when you create an account. We also
					collect usage data to improve our service.
				</p>
				<h2 className="text-xl font-semibold mt-8">How We Use Your Information</h2>
				<p>
					We use your information to provide grant matching services, send
					relevant grant notifications, and improve our platform. We do not sell
					your personal information to third parties.
				</p>
				<h2 className="text-xl font-semibold mt-8">Data Security</h2>
				<p>
					We implement industry-standard security measures to protect your
					information. All data is encrypted in transit and at rest.
				</p>
				<h2 className="text-xl font-semibold mt-8">Contact Us</h2>
				<p>
					Questions about this policy? Contact us at{' '}
					<a href="/contact">our contact page</a>.
				</p>
			</div>
		</div>
	);
}
