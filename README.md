# GrantMatch AI

GrantMatch AI is a Next.js 15 + React 19 platform that guides nonprofits to the right grants through an App Router UI backed by tRPC, Prisma, NextAuth, and Tailwind.

## Quick Start
- Install deps: `pnpm install`.
- Copy `.env.example` to `.env`, set `DATABASE_URL`, and align `NEXTAUTH_URL` + `NEXT_PUBLIC_APP_URL` to `http://localhost:3005`.
- Provision Postgres with `./start-database.sh` (regenerates the local password).
- Run `pnpm dev` to start Turbopack on port 3005; visit the same URL in your browser.
- After schema updates run `pnpm prisma migrate dev` then `pnpm prisma generate`.

## Application Structure
- `src/app` — App Router layouts and routes: `(auth)` onboarding, `login`, `dashboard`, `grants`, `org`, `profile`, `verify-email`, plus API handlers in `api/`.
- `src/components` — Reusable primitives in `ui/` and domain bundles for auth, grants, onboarding, profile, and layout providers.
- `src/lib` — Client helpers (tRPC client, auth utilities, formatting).
- `src/server` — Server-only tRPC routers and procedure composition (`api.ts`, `routers/`).
- `prisma` — Schema, migrations, seeds; `source_files/` for ingest data; `public/` for static assets.
- `scripts/` — Tooling such as `generate-password.ts` for seeded user hashes.

## Development & Testing
- `pnpm lint` enforces the Next.js ESLint config with Prettier + Tailwind; keep output clean before committing.
- Add Vitest or Playwright coverage where relevant; colocate specs as `*.test.ts` or `*.spec.tsx`.
- Cover critical tRPC procedures and Prisma flows, and note manual QA in PR descriptions.

## SOLID Practices
- **Single Responsibility**: Keep feature logic inside its route folder and move shared UI into `src/components/ui`.
- **Open/Closed**: Extend via new components or tRPC procedures instead of modifying stable code.
- **Liskov Substitution**: Define clear prop types and router contracts so alternatives drop in safely.
- **Interface Segregation**: Expose focused hooks/services rather than broad utility objects.
- **Dependency Inversion**: Have UI layers consume abstractions (tRPC calls, auth helpers) instead of direct Prisma access.

## Workflow & PRs
- Use short, present-tense commits (`added search filters on dashboard`) and group related work; reference issues with `#id` when available.
- PRs need a concise summary, visuals for UI work, and explicit notes on schema or env changes with confirmation that `pnpm lint` and required Prisma commands ran.
- See `AGENTS.md` for deeper contributor guidance.
