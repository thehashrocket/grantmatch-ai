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

## Project Architecture

### Tech Stack
- **Frontend**: Next.js 15 + React 19 with App Router
- **Backend**: tRPC for type-safe APIs, Prisma ORM with PostgreSQL
- **Auth**: NextAuth.js with credential and OAuth providers
- **Styling**: Tailwind CSS v4+ with Shadcn UI components
- **Forms**: React Hook Form with Zod validation
- **State**: React Query (@tanstack/react-query) for server state

### Directory Structure
- `src/app/` - App Router pages and API routes
  - `(auth)/` - Route group for authentication flows
  - `api/` - REST API endpoints and tRPC handler
  - Individual pages: `dashboard/`, `grants/`, `profile/`, `org/`
- `src/components/` - Reusable components
  - `ui/` - Shadcn UI primitives
  - Domain-specific components organized by feature
- `src/lib/` - Client-side utilities (tRPC client, auth helpers, formatting)
- `src/server/` - Server-only code (tRPC routers, procedures)
- `prisma/` - Database schema, migrations, and generated client output to `src/prisma/generated/`

### Key Patterns
- **tRPC Architecture**: Server procedures in `src/server/routers/`, client calls via `@/lib/trpc`
- **Database**: Prisma client generated to `src/prisma/generated/client` (custom output path)
- **Authentication**: NextAuth.js with custom credential provider, organization-based user model
- **Data Models**: User → Organization relationship, Grant management with import tracking
- **Server Components**: Default approach with selective "use client" for interactivity
- **Type Safety**: End-to-end TypeScript with tRPC, Zod schemas for validation

### Database Schema Highlights
- **Users**: Linked to organizations, support for both credential and OAuth auth
- **Organizations**: Multi-tenant structure with invitations system
- **Grants**: Complex model supporting multiple sources (Federal, California, Ohio, Other) with detailed metadata
- **Import System**: Batch grant import tracking with status management

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
- Copy `.env.example` to `.env`
- Set `DATABASE_URL` for PostgreSQL connection
- Configure `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to `http://localhost:3005`
- Use `./start-database.sh` for local PostgreSQL setup

### Testing Notes
- Add Vitest or Playwright for testing coverage
- Colocate test files as `*.test.ts` or `*.spec.tsx`
- Focus testing on critical tRPC procedures and Prisma flows
- Include manual QA notes in PR descriptions