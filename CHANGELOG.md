# Changelog

All notable changes to GrantMatch AI are documented here.

## [0.2.0.2] - 2026-08-07

### Fixed
- Cleared all 10 outstanding security advisories in the dependency tree, including one critical and five high. Every advisory was confined to development tooling; no shipped application dependency was affected.

### Changed
- Upgraded the test runner from vitest 2 to vitest 4, which moves the underlying build tooling from vite 5 to vite 8 and removes the vulnerable esbuild and postcss copies it carried.
- Pinned the legacy `brace-expansion` 1.x line to a patched release, clearing three denial-of-service advisories reachable through the lint toolchain.
- Renamed the vitest config to `vitest.config.mts` so it loads as a real ES module, removing a forward-compatibility warning from every test run.
- TypeScript now typechecks `.mts` files, so the vitest config is covered by `pnpm typecheck` again after the rename.

### Added
- `conductor.json` setup script for Conductor workspace automation — copies `.env` from root, installs deps, starts the Docker Postgres container, runs Prisma migrations, and launches the dev server

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
