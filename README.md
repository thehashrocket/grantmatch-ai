# GrantMatch AI

GrantMatch AI is a comprehensive grant discovery and management platform built for nonprofits. The application helps organizations find relevant grant opportunities from multiple sources (Federal, California, Ohio, and other funding sources), manage their grant pipeline, and collaborate with team members throughout the grant application process.

## Platform Overview

### Core Purpose
GrantMatch AI streamlines the grant discovery process by:
- **Aggregating grants** from multiple government and institutional sources
- **Intelligent search & filtering** by deadline, funding amount, geography, and grant source
- **Organization-based collaboration** with multi-user support and team invitations
- **Detailed grant information** including eligibility, funding details, and application requirements

### User Journey
1. **Landing Page** (`/`) - Marketing site showcasing platform features (Smart Matching, Streamlined Applications, Impact Tracking)
2. **Registration** (`/register`) - Account creation with email/password or OAuth (Google)
3. **Onboarding** (`/(auth)/onboarding`) - Three-step process:
   - **Personal Info** - Name, phone, avatar upload
   - **Company Info** - Organization details, mission, address, focus areas
   - **Team Invites** - Invite colleagues to join the organization
4. **Dashboard** (`/dashboard`) - Primary grant search interface with:
   - Advanced search filters (keyword, source, deadline, funding amount)
   - Active filter tags with quick removal
   - Paginated grant results with detailed card views
   - Grant count and real-time search feedback
5. **Grant Details** (`/grants/[id]`) - Comprehensive grant information including purpose, eligibility, funding details, and application links
6. **Profile** (`/profile`) - User account management
7. **Organization** (`/org`) - Organization settings and team management

### Technology Stack
- **Frontend**: Next.js 15 + React 19 with App Router
- **Backend**: tRPC for type-safe APIs, Prisma ORM with PostgreSQL
- **Auth**: NextAuth.js with credential and OAuth (Google) providers
- **Styling**: Tailwind CSS v4+ with Shadcn UI components
- **Forms**: React Hook Form with Zod validation
- **State**: React Query (@tanstack/react-query) for server state management

## Quick Start
1. **Install dependencies**: `pnpm install`
2. **Configure environment**: Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` for PostgreSQL connection
   - `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `http://localhost:3005`
   - `NEXTAUTH_SECRET` for session encryption
   - Optional: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` for OAuth
   - Optional: `RESEND_API_KEY` for email notifications
3. **Provision database**: `./start-database.sh` (regenerates local password)
4. **Run migrations**: `pnpm prisma migrate dev`
5. **Generate Prisma client**: `pnpm prisma generate`
6. **Start dev server**: `pnpm dev` (runs on port 3005 with Turbopack)

## Application Structure
- `src/app/` — Next.js App Router pages and API routes
  - `(auth)/` - Auth route group (register, onboarding)
  - `login/`, `dashboard/`, `grants/[id]/`, `profile/`, `org/`, `verify-email/` - Main pages
  - `api/` - REST endpoints (auth, grants, organizations, onboarding, grant imports) + tRPC handler
- `src/components/` — Reusable React components
  - `ui/` - Shadcn UI primitives (button, form, card, input, select, dialog, etc.)
  - `auth/`, `grants/`, `onboarding/`, `profile/` - Feature-specific components
  - `layout/` - Navigation components (Header, MainNav, MobileNav, UserNav)
  - `providers/` - Context providers (NextAuth, tRPC/React Query)
- `src/lib/` — Client-side utilities
  - `trpc/` - tRPC client configuration
  - `hooks/` - Custom React hooks (useGrantSearch, etc.)
  - `types/` - TypeScript type definitions
  - Auth helpers, formatting utilities
- `src/server/` — Server-only code
  - `routers/` - tRPC router definitions
  - `trpc.ts` - tRPC context and procedure setup
- `prisma/` — Database layer
  - `schema.prisma` - Database schema definition
  - `migrations/` - Database migration history
  - Generated Prisma client output: `src/prisma/generated/client`
- `scripts/` — Utility scripts (password generation, data seeding, etc.)

## Database Schema

### Core Models
- **User** - User accounts with auth (email/password or OAuth), role management, organization membership
- **Account** - OAuth provider accounts (NextAuth.js adapter)
- **Session** - User sessions (NextAuth.js adapter)
- **Organization** - Nonprofit organizations with mission, focus areas, address info
- **Invitation** - Team invitations for organization collaboration (PENDING/ACCEPTED/REJECTED)
- **Grant** - Grant opportunities with comprehensive metadata:
  - Multi-source support (FEDERAL, CALIFORNIA, OHIO, OTHER)
  - Deadline tracking (CLOSED, FIXED, ONGOING, ROLLING, TBD, UNKNOWN)
  - Funding details (estimated amounts, award floor/ceiling, disbursement info)
  - Eligibility and geographic requirements
  - Federal grant specifics (agency code, CFDA list)
- **GrantDetail** - Extended grant information (purpose, description, eligibility requirements, funding details as JSON)
- **GrantImportRun** - Batch import tracking for grant data ingestion (QUEUED, IN_PROGRESS, COMPLETED, FAILED)

### Key Relationships
- Users belong to Organizations (many-to-one)
- Organizations have many Users and Invitations
- Grants optionally have one GrantDetail (one-to-one)
- Users can create GrantImportRuns

## Development Commands
- **Dev server**: `pnpm dev` - Starts Next.js with Turbopack on port 3005
- **Build**: `pnpm build` - Runs `prisma generate` then `next build`
- **Lint**: `pnpm lint` - Runs Next.js ESLint config with TypeScript checking
- **Start production**: `pnpm start` - Starts production server
- **Database setup**: `./start-database.sh` - Provisions local PostgreSQL
- **Migrations**: `pnpm prisma migrate dev` - Apply schema changes to database
- **Generate client**: `pnpm prisma generate` - Regenerate Prisma client after schema changes
- **Import California grants**: `pnpm import:california` - Parse `source_files/california-grants-portal-data.csv` via the unified ingestion core
- **Sync CA grants (CKAN)**: `pnpm sync:ca-grants` - Runs the CKAN-based nightly sync locally (uses unified ingestion core)
- **Sync Federal grants (index)**: `pnpm sync:federal-grants` - Runs the Grants.gov index ingest (no detail fetch; details are on-demand)
- **Prisma Studio**: `pnpm prisma studio` - Visual database browser

## Grant sync & identity model
- **Sources**: Supports multiple sources (California CKAN and CSV, Federal index live; future-ready for others).
- **Identity**: Each grant carries `source`, `sourceRecordId` (preferred upstream id), `sourceKey` (hash fallback), and `number` (unique per-source). Portal IDs are deprecated for uniqueness.
- **Change detection**: `contentHash` detects field changes; `status` (`OPEN`/`CLOSED`/`UNKNOWN`) and `closedAt` track deadline/explicit closures; `lastSeenAt` marks sync freshness.
- **Run logging**: `GrantSyncRun` records each ingest with counters and schema snapshot; `GrantChange` logs CREATED/UPDATED/CLOSED/REOPENED/STATUS_CHANGED (plus `DETAILS_FETCHED` for on-demand detail pulls) with hashes and diffs.

## Running the California CKAN sync
1. Ensure `.env` has `DATABASE_URL`; set `TZ=America/Los_Angeles` in your environment if scheduling.
2. Run locally: `pnpm sync:ca-grants`.
3. Output: `GrantSyncRun` + `GrantChange` rows capture counts/errors; `Grant` rows are upserted idempotently.

## California CSV (legacy) import
- `pnpm import:california` uses the same unified ingestion core as CKAN, so identity/contentHash/status handling and logging are consistent.

## Federal ingestion & details
- Nightly index ingest (no full details): `pnpm sync:federal-grants` (envs: `FEDERAL_GRANTS_ELIGIBILITIES` default `12|13`; `FEDERAL_GRANTS_ROWS` default `500`; `FEDERAL_GRANTS_OPP_STATUSES` default `posted|forecasted|closed|archived`).
- Grant details are fetched on-demand when viewing a grant page or hitting `/api/grants/[id]/details`; failures don’t block page rendering. On-demand detail fetch logs a `GrantChange` with changeType `DETAILS_FETCHED`.

## Migrations (dev)
- Apply schema changes: `pnpm prisma migrate dev` (or `pnpm prisma migrate reset` to wipe dev data).
- Regenerate client after schema updates: `pnpm prisma generate`.

## Development & Testing
- `pnpm lint` enforces the Next.js ESLint config with Prettier + Tailwind; keep output clean before committing
- Add Vitest or Playwright coverage where relevant; colocate specs as `*.test.ts` or `*.spec.tsx`
- Cover critical tRPC procedures and Prisma flows, and note manual QA in PR descriptions
- Use Server Components by default; add "use client" only when needed for interactivity
- Prefer tRPC calls over direct Prisma access in UI components

## SOLID Practices
- **Single Responsibility**: Keep feature logic inside its route folder and move shared UI into `src/components/ui`.
- **Open/Closed**: Extend via new components or tRPC procedures instead of modifying stable code.
- **Liskov Substitution**: Define clear prop types and router contracts so alternatives drop in safely.
- **Interface Segregation**: Expose focused hooks/services rather than broad utility objects.
- **Dependency Inversion**: Have UI layers consume abstractions (tRPC calls, auth helpers) instead of direct Prisma access.

## Key Features & Implementation Notes

### Authentication & Authorization
- NextAuth.js v4 with custom credential provider
- Support for OAuth (Google) and email/password authentication
- Organization-based access control
- Email verification flow
- Session management with database persistence

### Grant Management
- Multi-source grant aggregation (Federal via grants.gov, state-level sources)
- Advanced search with compound filters (keyword, source, deadline range, funding amount)
- Paginated results with configurable page sizes
- Detailed grant views with rich metadata
- Import system for batch grant data ingestion with status tracking

### Organization Collaboration
- Multi-tenant architecture with organization isolation
- Team invitation system with email-based workflow
- Role-based access (USER, ADMIN)
- Shared grant pipeline across organization members

### UI/UX
- Responsive design with mobile-first approach
- Dark mode support throughout
- Loading states with React Suspense and skeleton components
- Error boundaries for graceful error handling
- Toast notifications for user feedback (Sonner)
- Animated gradients and visual polish on marketing pages

### Data Architecture
- Custom Prisma client output path (`src/prisma/generated/client`)
- JSON columns for flexible metadata (eligibility requirements, CFDA lists, funding details)
- Composite unique constraints for data integrity (portalId + source, email + organizationId)
- Optimistic date handling for various deadline types

## Workflow & PRs
- Use short, present-tense commits (`added search filters on dashboard`) and group related work; reference issues with `#id` when available
- PRs need a concise summary, visuals for UI work, and explicit notes on schema or env changes
- Confirm `pnpm lint` passes and Prisma commands (`migrate dev`, `generate`) ran successfully
- See `AGENTS.md` for deeper contributor guidance and AI agent workflows
- See `CLAUDE.md` for Claude Code-specific development guidelines
