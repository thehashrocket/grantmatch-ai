# Changelog

All notable changes to GrantMatch AI are documented here.

## [0.2.1.1] - 2026-09-03

### Fixed
- Cleared five GitHub security advisories in `fast-uri`, a transitive dependency pulled in through `ajv` (via `@hookform/resolvers`, Prisma, and webpack's `schema-utils`): host confusion / SSRF-style URI parsing bugs (CVE-2026-76172 and three related advisories) plus a same-day authority-injection advisory (CVE-2026-84292) caught during review. Pinned `fast-uri` to `^3.1.7` via a pnpm override — the first version patched against all five.

## [0.2.1.0] - 2026-08-10

### Fixed
- The grant sync and backfill scripts (`pnpm sync:ca-grants`, `sync:federal-grants`, `import:california`, and the fit-score backfill) now run. All four imported `dotenv/config` while `dotenv` was never declared as a dependency, so every one of them failed immediately with `ERR_MODULE_NOT_FOUND`. Scheduled syncing was unaffected — it runs through the `/api/cron/*` routes, not these scripts.
- Validation failures from the grant-import endpoints return their `details` payload again. The field is now read from the Zod 4 property name; left as-is it would have serialized as absent.

### Changed
- Node 24 LTS is now a declared requirement (`engines.node: "24.x"`). **Deploy note:** Vercel reads `engines.node` and it overrides the project's Node setting, so the Vercel project must be moved from 22.x to 24.x alongside this release.
- Upgraded seven dependency majors: Zod 3 to 4, TypeScript 5 to 7, Resend 4 to 6, lucide-react to 1.x, `@hookform/resolvers` 4 to 5, `@vercel/analytics` 1 to 2, and cuid2 2 to 3. `@types/node` deliberately stays on 24 to match the runtime rather than tracking ahead of it.
- Migrated off the Zod APIs deprecated in v4 (`z.string().email()`, `z.string().url()`, `z.nativeEnum`) so the codebase is not sitting on surface that Zod 5 removes. Email, URL, and enum validation were each verified to accept and reject exactly what they did before.
- Linting is Biome only. The README and CLAUDE.md previously described an ESLint and Prettier setup that had already stopped running.

### Removed
- Deleted the unused ESLint and Prettier toolchains along with `eslint.config.mjs`. Neither was wired to any command: `pnpm lint` runs Biome, CI runs `pnpm lint`, and Next 16 removed `next lint`. This drops 250 packages from the install.
- Dropped the `brace-expansion` pnpm override. It resolved to the same version with or without the pin, and the dependency path that made it necessary came in through ESLint, which is now gone.

### Added
- Tests covering organization profile validation: empty-string clearing, explicit nulls, award-range bounds, and collection limits. The empty-string path decides whether clearing a form field leaves a column untouched or writes NULL over it, and it previously had no direct coverage.

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
