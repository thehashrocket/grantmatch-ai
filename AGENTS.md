# Repository Guidelines

Follow these standards to keep contributions consistent with the GrantMatch AI codebase.

## Project Structure & Module Organization

- Next.js App Router lives in `src/app`, with route groups such as `(auth)` and API handlers under `src/app/api`.
- Reusable UI primitives belong in `src/components/ui`; feature-specific components sit in `src/components/{domain}`.
- Client helpers (auth, tRPC, formatting) stay in `src/lib`; server-only routers live in `src/server`.
- Prisma schema and migrations live in `prisma/`; static assets in `public/`; reference assets in `source_files/`; ad-hoc tooling in `scripts/`.

## Build, Test, and Development Commands

- `pnpm dev` starts the Turbopack dev server on <http://localhost:3005>.
- `pnpm build` compiles the production bundle; run before deploying.
- `pnpm start` serves the built bundle for smoke testing.
- `pnpm lint` applies the Next.js ESLint ruleset (ensure clean output before review).
- `pnpm prisma migrate dev` updates the local database; pair with `pnpm prisma generate` after schema edits.

## Coding Style & Naming Conventions

- Write React 19 components in TypeScript with two-space indentation and single quotes (JSX attributes may use double quotes).
- File names use kebab-case (`src/components/ui/button.tsx`); components export in PascalCase.
- Prettier (with Tailwind plugin) and `next/core-web-vitals` ESLint manage formatting and utility ordering—do not hand-sort Tailwind classes.

## Testing Guidelines

- Add Vitest or Playwright coverage alongside new features; document any new scripts.
- Name test files `*.test.ts` or `*.spec.tsx` and colocate them with the code they exercise.
- Cover core tRPC procedures and Prisma flows at minimum; record manual QA steps in the PR description.

## Commit & Pull Request Guidelines

- Use short, present-tense commit messages (e.g., `added search filters on dashboard`) and group related changes.
- Reference issues with `#id` when relevant and avoid mixing unrelated work in a single commit.
- Pull requests need a concise summary, screenshots or recordings for UI updates, and explicit notes on schema or env changes.
- Confirm `pnpm lint` (and database migrations when touched) before requesting review.

## Security & Configuration

- Copy `.env.example` to `.env`, set `DATABASE_URL`, then run `./start-database.sh` to provision Postgres and rotate default passwords.
- Align `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with the dev server (port 3005 by default).
- Never commit secrets or generated password hashes; share seeded credentials via the helper script `pnpm tsx scripts/generate-password.ts "sup3r-secret"`.
- Lock down ingest endpoints: `/api/gp/start` and `/api/gp/import` currently have no auth; add NextAuth checks or a shared secret header before exposing them beyond trusted automation.
- Avoid stubbed handlers: `/api/user` PATCH is a no-op; wire it to the database if you rely on profile updates.
- Surface fetch failures: `/api/grants/[id]/details` currently swallows errors; prefer returning an explicit error or status so the UI can react.

## Bookmarking

- Per-user bookmarks: max 100/user; statuses are `INTERESTED`, `APPLIED`, `NOT_FOR_US`.
- Bookmark payload includes optional note (<=2000 chars) and tags (max 10, normalized lowercase with collapsed whitespace, 30 chars max, deduped).
- Do not change grant matching to include bookmark state; fetch bookmark state separately via `bookmark.statusMap` after `getMatchesPaginated`.
- `statusMap` returns tags (not note) for optimistic UI; keep it lightweight and invalidate on toggle/status/meta updates.
- Dashboard and grant detail must call `bookmark.statusMap` with the visible grantIds; profile uses `bookmark.list` filtering/sorting client-side (<=100 rows).

## Documentation

- Prisma 7.2.0: <https://www.prisma.io/llms.txt>
- Next.js 16.1.1: <https://nextjs.org/docs/llms-full.txt>
- React 19.2.3: <https://react.dev/reference/react>
