# Repository Guidelines

## Project Structure & Module Organization
The Next.js App Router lives in `src/app`, with route groups (e.g. `(auth)`) and API handlers under `src/app/api`, while page components stay co-located with their layouts. Shared UI primitives sit in `src/components/ui`; feature-specific components belong in `src/components/{domain}`. Client helpers (tRPC, auth, formatting) go in `src/lib`, and server-only routers live in `src/server`. Prisma schema and migrations reside in `prisma/`, with data assets in `source_files/`. Static files belong in `public/`, and one-off utilities such as `scripts/generate-password.ts` stay in `scripts/`.

## Build, Test, and Development Commands
Run `pnpm dev` to boot the Turbopack dev server on port 3005. Use `pnpm build` before deployments and `pnpm start` to verify the production bundle. `pnpm lint` applies the Next.js ESLint ruleset. Update the database with `pnpm prisma migrate dev` and regenerate the Prisma client via `pnpm prisma generate`. Password hashes for seeded accounts can be created with `pnpm tsx scripts/generate-password.ts "sup3r-secret"`.

## Coding Style & Naming Conventions
We author TypeScript React 19 components and rely on Prettier (with the Tailwind plugin) plus the `next/core-web-vitals` ESLint config; prefer two-space indentation and single quotes in TS/TSX except when JSX attributes require double quotes. Export React components in PascalCase, keep file names kebab-case (`src/components/ui/button.tsx`), and colocate route-specific logic alongside its page. Tailwind utility ordering is handled by Prettier—avoid manual reordering.

## Testing Guidelines
A formal test runner is not yet wired in; add coverage alongside new features using Vitest or Playwright as appropriate and document any new scripts. Name test files `*.test.ts` or `*.spec.tsx` and colocate them near the code they exercise. At minimum, exercise core tRPC procedures and Prisma data flows, and describe any manual QA in the PR. Always run `pnpm lint` before requesting review.

## Commit & Pull Request Guidelines
Follow the existing short, present-tense commit style (`added search filters on dashboard`). Group related changes per commit and reference issues with `#id` when available. Pull requests should include a concise summary, screenshots or recordings for UI updates, schema or env changes called out explicitly, and confirmation that `pnpm lint` and any Prisma migrations ran. Request review once feature flags, env vars, and migrations are documented.

## Environment & Security Notes
Copy `.env.example` to `.env` and update `DATABASE_URL` before running `./start-database.sh`, which provisions a local Postgres container and rotates the password if left as default. Align `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with the dev server (port 3005 by default). Never commit secrets or generated hashes; share seeded credentials using the hash output from the helper script.
