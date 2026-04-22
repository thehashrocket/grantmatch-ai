import type { MetadataRoute } from 'next';
import { getIndexableGrantIds } from '@/lib/public-grants';

const BASE_URL =
	process.env.NEXT_PUBLIC_APP_URL ?? 'https://aigrantmatch.com';

const STATIC_ROUTES = ['/', '/about', '/grants', '/privacy', '/terms', '/contact'];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const grantIds = await getIndexableGrantIds();

	const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((route) => ({
		url: new URL(route, BASE_URL).toString(),
		lastModified: new Date(),
		changeFrequency: 'weekly',
		priority: route === '/' ? 1.0 : 0.7,
	}));

	const sourceEntries: MetadataRoute.Sitemap = ['federal', 'california', 'ohio', 'other'].map(
		(source) => ({
			url: new URL(`/grants/source/${source}`, BASE_URL).toString(),
			lastModified: new Date(),
			changeFrequency: 'daily' as const,
			priority: 0.8,
		}),
	);

	const grantEntries: MetadataRoute.Sitemap = grantIds.map(({ id, updatedAt }) => ({
		url: new URL(`/grants/${id}`, BASE_URL).toString(),
		lastModified: updatedAt,
		changeFrequency: 'weekly' as const,
		priority: 0.6,
	}));

	return [...staticEntries, ...sourceEntries, ...grantEntries];
}
