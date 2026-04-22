# Changelog

All notable changes to GrantMatch AI are documented here.

## [0.2.0] - 2026-04-22

### Added
- Public grant browse page (`/grants`) — discover open grants without signing in
- Source facet pages (`/grants/source/federal`, `/california`, `/ohio`, `/other`) — browse by funding source
- JSON-LD structured data on grant detail pages for Google rich results
- SEO metadata (title, description, Open Graph, canonical URLs) on all grant pages
- Dynamic XML sitemap including all indexable grant URLs (capped at 50,000 per Google's limit)
- Privacy policy, Terms of Service, and Contact pages
- Custom 404 and 500 error pages with navigation recovery
- Google Search Console verification tag
- Google Analytics (GA4) tracking

### Changed
- Sitemap updated to include `/grants`, `/privacy`, `/terms`, `/contact`, and all source facet pages
- Closed grants receive `noindex` robots directive to prevent search indexing of expired opportunities
- `formatDeadline` extracted to shared utility to eliminate duplication
