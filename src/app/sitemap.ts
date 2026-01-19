import type { MetadataRoute } from 'next';

const getBaseUrl = () =>
	process.env.NEXT_PUBLIC_APP_URL ||
	process.env.NEXTAUTH_URL ||
	'http://localhost:3005';

export default function sitemap(): MetadataRoute.Sitemap {
	const baseUrl = getBaseUrl();
	const routes = [
		'/',
		'/about',
		'/login',
		'/verify-email',
	];

	return routes.map((route) => ({
		url: new URL(route, baseUrl).toString(),
		lastModified: new Date(),
	}));
}
