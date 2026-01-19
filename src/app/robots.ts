import type { MetadataRoute } from 'next';

const getBaseUrl = () =>
	process.env.NEXT_PUBLIC_APP_URL ||
	process.env.NEXTAUTH_URL ||
	'http://localhost:3005';

export default function robots(): MetadataRoute.Robots {
	const baseUrl = getBaseUrl();
	return {
		rules: [
			{
				userAgent: '*',
				allow: '/',
				disallow: [
					'/admin',
					'/dashboard',
					'/bookmarks',
					'/profile',
					'/login',
					'/verify-email',
					'/org',
					'/api',
				],
			},
		],
		sitemap: `${baseUrl}/sitemap.xml`,
	};
}
