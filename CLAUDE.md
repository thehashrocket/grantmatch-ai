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
  - Pages: `login/`, `dashboard/`, `grants/[id]/`, `profile/`, `org/`, `verify-email/`
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
- Add Vitest or Playwright for testing coverage
- Colocate test files as `*.test.ts` or `*.spec.tsx`
- Focus testing on critical tRPC procedures and Prisma flows
- Include manual QA notes in PR descriptions