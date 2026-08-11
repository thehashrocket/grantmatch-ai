# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development Commands

### Core Development
```bash
# Start development server on port 3005 with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Lint code using Biome
pnpm lint

# Auto-format using Biome
pnpm format

# Typecheck without emitting
pnpm typecheck
```

### Database Operations
```bash
# Start local Postgres container with automatic password generation
./start-database.sh

# Update database schema and run migrations
pnpm prisma migrate dev

# Regenerate Prisma client after schema changes
pnpm prisma generate

# Generate password hash for seeded accounts
pnpm tsx scripts/generate-password.ts "your-password-here"
```

### Testing Commands
```bash
# Run single test file (when tests are added)
# pnpm vitest run path/to/test.spec.ts

# Run tests in watch mode (when tests are added)
# pnpm vitest
```

## Architecture Overview

### Stack
- **Framework**: Next.js 15 App Router with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js with custom credentials + Google OAuth
- **API Layer**: tRPC with React Query for type-safe APIs
- **UI Components**: Radix UI primitives with custom shadcn/ui components
- **Styling**: Tailwind CSS v4+ with custom design tokens
- **Package Manager**: pnpm with workspace configuration

### Directory Structure
```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── (auth)/            # Route group for auth pages
│   ├── api/               # API route handlers
│   └── dashboard/         # Main application dashboard
├── components/            # React components organized by domain
│   ├── ui/               # Base UI primitives (shadcn/ui)
│   ├── auth/             # Authentication forms
│   ├── grants/           # Grant search and display components
│   ├── layout/           # Navigation and layout components
│   ├── onboarding/       # Multi-step organization setup
│   └── providers/        # Context providers
├── lib/                  # Shared utilities and configurations
│   ├── hooks/           # Custom React hooks
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic layer
│   ├── trpc/           # tRPC client configuration
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   └── validations/    # Zod schemas
└── server/              # Server-side code
    └── api/            # tRPC router definitions
```

### Key Architecture Patterns

#### Authentication & Authorization
- **NextAuth.js** handles both OAuth (Google) and credential-based authentication
- **Role-based access** with `USER` and `ADMIN` roles
- **Organization-scoped** data access via `organizationId` associations
- **Email verification** required for credential sign-ups
- Session stored as JWT with role and organization data

#### Data Layer Architecture
- **Repository Pattern**: `GrantRepository` abstracts Prisma database operations
- **Service Layer**: `GrantService` contains business logic and scoring algorithms
- **Type Safety**: Full end-to-end TypeScript with Prisma-generated types
- **Custom Prisma Client**: Generated in `src/prisma/generated/client`

#### API Architecture
- **tRPC** provides type-safe APIs with automatic client generation
- **React Query** handles caching, loading states, and mutations
- **Superjson** enables serialization of dates and BigInts
- **Server Actions** pattern for form submissions and mutations

#### Grant Matching System
- **Multi-source grants**: Supports Federal, California, Ohio, and other sources
- **Fit scoring algorithm**: Custom scoring system in `grant-scoring.ts`
- **Advanced filtering**: Text search, funding ranges, deadlines, fit scores
- **Pagination**: Server-side pagination for large result sets

### Database Schema Notes

#### Core Models
- **User**: Links to Organization, supports both OAuth and credential auth
- **Organization**: Multi-tenant structure with focus areas and mission
- **Grant**: Central model with support for different sources (Federal/State)
- **GrantDetail**: Extended grant information stored as JSON for flexibility

#### Important Relationships
- Users belong to Organizations (multi-tenant architecture)
- Grants support multiple sources with different ID schemes
- Grant details stored separately for performance optimization

### Component Guidelines

#### State Management
- **URL state** with Next.js searchParams for shareable filters
- **React Query** for server state management
- **Local component state** for UI interactions only
- **Custom hooks** like `useGrantSearch` encapsulate complex state logic

#### Form Handling
- **React Hook Form** with Zod validation
- **Controlled components** for consistent state management
- **Loading and error states** handled consistently across forms

#### UI Patterns
- **Shadcn/ui components** for consistent design system
- **Responsive design** with mobile-first Tailwind classes
- **Loading skeletons** and **error boundaries** for better UX
- **Progressive enhancement** with proper fallbacks

## Environment Setup

### Required Environment Variables
```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/grantmatch-ai-postgres"

# Authentication
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3005"
NEXT_PUBLIC_APP_URL="http://localhost:3005"

# Google OAuth (if using)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email (if using Resend)
RESEND_API_KEY="your-resend-key"
```

### Development Setup
1. Copy environment variables and update `DATABASE_URL`
2. Run `./start-database.sh` to start local Postgres with Docker
3. Run `pnpm prisma migrate dev` to set up database schema
4. Run `pnpm dev` to start development server on port 3005

## Code Style & Standards

### TypeScript Guidelines
- Export React components in PascalCase
- Use interfaces for component props and data structures
- Prefer type inference over explicit typing where clear
- Avoid enums; use const assertions for static values

### Component Organization
- Server Components by default; add `'use client'` only when needed
- Co-locate route-specific components with their pages
- Feature-specific components in domain folders (`components/grants/`)
- Keep components focused and single-responsibility

### File Naming
- Components: `PascalCase.tsx`
- Utilities and services: `camelCase.ts`
- Route files: `page.tsx`, `layout.tsx`, `route.ts`
- Test files: `*.test.ts` or `*.spec.tsx`

### Styling Conventions
- **Tailwind CSS v4+** utility classes
- **Mobile-first** responsive design
- **Biome** handles formatting (`pnpm format`); Prettier is not used
- Two-space indentation, single quotes in TS/TSX

## Development Workflow

### Before Committing
- Run `pnpm lint` to check for code style issues
- Ensure Prisma migrations are complete if schema changed
- Test major functionality manually (no automated tests yet)

### Pull Request Guidelines
- Include screenshots for UI changes
- Document any schema changes or new environment variables
- Reference related issues with `#issue-number`
- Confirm all linting passes and builds successfully