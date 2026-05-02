# Academia — School Academic Management System

## Overview
A Next.js 15 school academic management platform using Supabase for auth/database and Prisma as ORM. Features role-based access control (RBAC) for administrators and faculty, with dashboards, marks management, class scheduling, and exam tracking.

## Tech Stack
- **Framework**: Next.js 15 (App Router) — kept as-is from original Vercel project
- **Auth & DB**: Supabase (auth + PostgreSQL)
- **ORM**: Prisma
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI + shadcn/ui, MUI
- **State**: TanStack React Query
- **Runtime**: Node.js

## Project Structure
```
artifacts/academia/       # Main Next.js app
  src/
    app/                  # Next.js App Router pages
      admin/              # Admin dashboard
      faculty/            # Faculty portal
      auth/               # Auth pages
      api/                # API routes (Next.js route handlers)
    components/           # Shared UI components
    lib/
      supabase/           # Supabase client config
      server/             # Server-side utilities (session, etc.)
  prisma/                 # Prisma schema & migrations
artifacts/api-server/     # Shared Express API server (scaffold, minimal use)
```

## Environment Variables Required
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/publishable key
- `AUTH_SECRET` — Session signing secret

## Running the App
The app runs via the `artifacts/academia: web` workflow using:
```
pnpm --filter @workspace/academia run dev
```
Next.js listens on `$PORT` (18373) bound to `0.0.0.0`.

## Notes
- Original Next.js stack preserved — no migration to Vite/React
- `NEXT_PUBLIC_*` env vars are Supabase credentials, not database URLs
- Prisma client is generated from `artifacts/academia/prisma/schema.prisma`
