# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `pnpm dev` - Starts Next.js with Turbopack on port 3005
- **Build**: `pnpm build` - Runs `prisma generate` then `next build`
- **Lint**: `pnpm lint` - Runs Next.js ESLint config with TypeScript checking
- **Start production**: `pnpm start` - Starts production server
- **Database setup**: `./start-database.sh` - Provisions local PostgreSQL and regenerates password
- **Database migrations**: `pnpm prisma migrate dev` - Apply schema changes to database
- **Generate Prisma client**: `pnpm prisma generate` - Regenerate Prisma client after schema changes

## Project Overview

**GrantMatch AI** is a grant discovery and management platform for nonprofits. It aggregates grants from multiple sources (Federal, California, Ohio, and other funding sources), provides intelligent search and filtering, and enables organization-based collaboration.

### User Flow
1. **Landing** (`/`) - Marketing features showcase
2. **Register** (`/register`) - Email/password or Google OAuth signup
3. **Onboarding** (`/(auth)/onboarding`) - 3-step process: personal info → company info → team invites
4. **Dashboard** (`/dashboard`) - Grant search with filters, pagination, and results
5. **Grant Details** (`/grants/[id]`) - Comprehensive grant information and application links
6. **Profile/Org** - Account and organization management

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 with App Router
- **Backend**: tRPC for type-safe APIs, Prisma ORM with PostgreSQL
- **Auth**: NextAuth.js with credential and OAuth (Google) providers
- **Styling**: Tailwind CSS v4+ with Shadcn UI components
- **Forms**: React Hook Form with Zod validation
- **State**: React Query (@tanstack/react-query) for server state
- **Notifications**: Sonner for toast messages
- **Email**: Resend for transactional emails (optional)

### Directory Structure
- `src/app/` - App Router pages and API routes
  - `(auth)/` - Route group for authentication flows (register, onboarding)
  - `api/` - REST endpoints (auth, grants, organizations, onboarding, grant imports) + tRPC handler at `api/trpc/[trpc]/`
  - Public pages (no auth): `grants/` (browse), `grants/source/[source]/` (facet), `grants/[id]/` (detail), `contact/`, `privacy/`, `terms/`
  - Authenticated pages: `login/`, `dashboard/`, `profile/`, `org/`, `verify-email/`
  - Error pages: `error.tsx` (500), `not-found.tsx` (404)
- `src/components/` - Reusable React components
  - `ui/` - Shadcn UI primitives (button, form, card, input, select, dialog, avatar, etc.)
  - `auth/` - Login and registration forms
  - `grants/` - Grant cards, search forms, filters, pagination, detailed views
  - `onboarding/` - Multi-step form components (personal, company, team invite)
  - `layout/` - Header, navigation (MainNav, MobileNav, UserNav)
  - `providers/` - NextAuth and tRPC/React Query providers
- `src/lib/` - Client-side utilities
  - `trpc/` - tRPC client setup and React Query integration
  - `hooks/` - Custom hooks (useGrantSearch, etc.)
  - `types/` - TypeScript type definitions
  - `seo/` - SEO utilities: `grants.ts` exports `grantMetadata()`, `grantJsonLd()`, `truncateDescription()`
  - `public-grants.ts` - Unauthenticated Prisma query layer for public grant browsing
  - Auth helpers, date formatting, and utility functions
- `src/server/` - Server-only code
  - `routers/` - tRPC router definitions
  - `trpc.ts` - tRPC context, procedures, and middleware
- `prisma/` - Database layer
  - `schema.prisma` - Database schema definition
  - `migrations/` - Migration history
  - Generated client: `src/prisma/generated/client` (custom output path)

### Key Patterns
- **tRPC Architecture**: Server procedures in `src/server/routers/`, client calls via `@/lib/trpc`
- **Database**: Prisma client generated to `src/prisma/generated/client` (custom output path)
- **Authentication**: NextAuth.js with custom credential provider, organization-based user model
- **Data Models**: User → Organization relationship, Grant management with import tracking
- **Server Components**: Default approach with selective "use client" for interactivity
- **Type Safety**: End-to-end TypeScript with tRPC, Zod schemas for validation

### Database Schema Highlights
- **User** - Auth (email/password or OAuth via Account model), role (USER/ADMIN), belongs to Organization
- **Organization** - Nonprofit details (name, mission, focus areas, address), has many Users and Invitations
- **Invitation** - Email-based team invitations with status (PENDING/ACCEPTED/REJECTED)
- **Grant** - Multi-source grant data (FEDERAL/CALIFORNIA/OHIO/OTHER) with:
  - Deadline tracking (CLOSED/FIXED/ONGOING/ROLLING/TBD/UNKNOWN)
  - Funding metadata (amounts, award floor/ceiling, disbursement)
  - Eligibility and geographic requirements
  - Federal specifics (agency code, CFDA list as JSON)
  - Optional one-to-one GrantDetail with extended info (purpose, description, requirements as JSON)
- **GrantImportRun** - Batch import tracking (QUEUED/IN_PROGRESS/COMPLETED/FAILED), linked to requesting User
- **Session, Account, VerificationToken** - NextAuth.js adapter models

### Development Guidelines
- Follow SOLID principles as outlined in README.md
- Use Server Components by default, add "use client" only when needed
- Prefer tRPC calls over direct Prisma access in UI components
- Keep feature logic within route folders, shared UI in `src/components/ui`
- Run `pnpm lint` before committing - output must be clean
- Use Tailwind CSS v4+ features, follow mobile-first responsive design
- Implement proper loading states with React Suspense
- Use React Hook Form with Zod validation for all forms

### Environment Setup
- Copy `.env.example` to `.env` and configure:
  - `DATABASE_URL` - PostgreSQL connection string
  - `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` - Set to `http://localhost:3005`
  - `NEXTAUTH_SECRET` - Session encryption key (generate with `openssl rand -base64 32`)
  - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` - OAuth credentials (optional)
  - `RESEND_API_KEY` and `RESEND_FROM_EMAIL` - Email service credentials (optional)
- Use `./start-database.sh` for local PostgreSQL setup (regenerates password automatically)

### Testing Notes
- **Test runner**: `pnpm test` (Vitest) — 125 tests across 24 files
- Colocate test files as `*.test.ts` next to the module they test
- Mock `@/lib/db` via `vi.mock` with `vi.hoisted()` for database-dependent code
- Public data layer tests in `src/lib/public-grants.test.ts`
- SEO utility tests in `src/lib/seo/grants.test.ts`
- Include manual QA notes in PR descriptions for UI changes

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool. When in doubt, invoke the skill.

Key routing rules:
- Product ideas/brainstorming → invoke /office-hours
- Strategy/scope → invoke /plan-ceo-review
- Architecture → invoke /plan-eng-review
- Design system/plan review → invoke /design-consultation or /plan-design-review
- Full review pipeline → invoke /autoplan
- Bugs/errors → invoke /investigate
- QA/testing site behavior → invoke /qa or /qa-only
- Code review/diff check → invoke /review
- Visual polish → invoke /design-review
- Ship/deploy/PR → invoke /ship or /land-and-deploy
- Save progress → invoke /context-save
- Resume context → invoke /context-restore

## GBrain Configuration (configured by /setup-gbrain)
- Mode: local-stdio
- Engine: postgres (Supabase project `ftahhwqedtldkhvjfjig`, us-east-1)
- Connection: direct DB URL (port 5432) — pooler credentials still propagating; see note
- Config file: ~/.gbrain/config.json (mode 0600)
- Setup date: 2026-05-14
- MCP registered: yes (user scope) via `~/.gbrain/serve-wrapper.sh` (cd $HOME first to avoid project .env collision)
- Artifacts sync: artifacts-only
- Artifacts repo: https://github.com/thehashrocket/gstack-artifacts-jasonshultz
- Current repo policy: read-write

Note on cwd: gbrain v0.33.2.1 auto-loads `.env` from cwd. When this project's `.env` is in scope, gbrain incorrectly tries to connect to `grantmatch-ai-postgres`. The MCP wrapper script cd's to $HOME first. CLI calls from this repo's terminal need to `cd ~/` or pass `GBRAIN_DATABASE_URL` explicitly.

Note on pooler: Supabase Session Pooler (port 6543) credentials lag behind direct DB password resets. To switch to pooler later, wait ~hours then re-run init against the pooler URL.

pglite backup: `~/.gbrain/brain.pglite.bak-20260514-124937` (1.2GB) preserved in case any local-only data needs recovery.

## GBrain Search Guidance (configured by /sync-gbrain)
<!-- gstack-gbrain-search-guidance:start -->

GBrain is set up and synced on this machine. The agent should prefer gbrain
over Grep when the question is semantic or when you don't know the exact
identifier yet.

**This worktree is pinned to a worktree-scoped code source** via the
`.gbrain-source` file in the repo root (kubectl-style context). Any
`gbrain code-def`, `code-refs`, `code-callers`, `code-callees`, or `query`
call from anywhere under this worktree routes to that source by default —
no `--source` flag needed. Conductor sibling worktrees of the same repo
each have their own pin and their own indexed pages, so semantic results
match the actual code on disk in this worktree.

Two indexed corpora available via the `gbrain` CLI:
- This worktree's code (auto-pinned via `.gbrain-source`).
- `~/.gstack/` curated memory (registered as `gstack-brain-<user>` source via
  the existing federation pipeline).

Prefer gbrain when:
- "Where is X handled?" / semantic intent, no exact string yet:
    `gbrain search "<terms>"` or `gbrain query "<question>"`
- "Where is symbol Y defined?" / symbol-based code questions:
    `gbrain code-def <symbol>` or `gbrain code-refs <symbol>`
- "What calls Y?" / "What does Y depend on?":
    `gbrain code-callers <symbol>` / `gbrain code-callees <symbol>`
- "What did we decide last time?" / past plans, retros, learnings:
    `gbrain search "<terms>" --source gstack-brain-<user>`

Grep is still right for known exact strings, regex, multiline patterns, and
file globs. Run `/sync-gbrain` after meaningful code changes; for ongoing
auto-sync across all worktrees, run `gbrain autopilot --install` once per
machine — gbrain's daemon handles incremental refresh on a schedule.

<!-- gstack-gbrain-search-guidance:end -->