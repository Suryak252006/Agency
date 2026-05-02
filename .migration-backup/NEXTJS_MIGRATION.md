# Next.js Migration Plan & Directory Structure

## New Project Structure (Modular Monolith)

```
academia/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group (no layout wrapper)
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/              # Protected routes with layout
│   │   │   ├── layout.tsx            # Auth check, nav
│   │   │   ├── faculty/
│   │   │   │   ├── page.tsx          # Classes list
│   │   │   │   ├── class/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── page.tsx  # Section View (marks entry)
│   │   │   │   │   │   └── loading.tsx
│   │   │   │   ├── requests/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── loading.tsx
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx          # Dashboard
│   │   │   │   ├── students/page.tsx
│   │   │   │   ├── classes/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/page.tsx
│   │   │   │   ├── faculty/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── [id]/form.tsx
│   │   │   │   ├── requests/page.tsx
│   │   │   │   ├── logs/page.tsx
│   │   │   │   └── communication/page.tsx
│   │   │   └── loading.tsx
│   │   ├── api/                      # API Routes
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts
│   │   │   │   ├── signup/route.ts
│   │   │   │   ├── logout/route.ts
│   │   │   │   └── session/route.ts
│   │   │   ├── marks/
│   │   │   │   ├── route.ts          # GET, POST draft
│   │   │   │   ├── submit/route.ts
│   │   │   │   ├── approve/route.ts
│   │   │   │   ├── lock/route.ts
│   │   │   │   └── [id]/
│   │   │   │       └── history/route.ts
│   │   │   ├── requests/
│   │   │   │   ├── route.ts          # GET, POST
│   │   │   │   └── [id]/
│   │   │   │       ├── approve/route.ts
│   │   │   │       └── reject/route.ts
│   │   │   ├── classes/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── students/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── exams/
│   │   │   │   ├── route.ts
│   │   │   │   └── [id]/route.ts
│   │   │   ├── communication/
│   │   │   │   └── send/route.ts
│   │   │   └── logs/
│   │   │       └── route.ts
│   │   ├── error.tsx                 # Error boundary
│   │   ├── not-found.tsx
│   │   └── layout.tsx                # Root layout
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # shadcn UI (unchanged)
│   │   ├── layouts/
│   │   │   ├── FacultyLayout.tsx
│   │   │   └── AdminLayout.tsx
│   │   ├── marks/
│   │   │   ├── MarkEntryForm.tsx
│   │   │   ├── MarkPreview.tsx
│   │   │   └── MarkHistoryView.tsx
│   │   ├── requests/
│   │   │   ├── RequestForm.tsx
│   │   │   ├── RequestList.tsx
│   │   │   └── RequestDetails.tsx
│   │   ├── common/
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ConfirmDialog.tsx
│   │   └── AttentionStudents.tsx     # (from existing)
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── api.ts                    # API client (client-side fetch wrapper)
│   │   ├── auth.ts                   # Auth helpers
│   │   ├── db.ts                     # Prisma client singleton
│   │   ├── utils.ts                  # (existing)
│   │   ├── server/
│   │   │   ├── marks.ts              # Business logic (server-side only)
│   │   │   ├── requests.ts
│   │   │   ├── classes.ts
│   │   │   ├── students.ts
│   │   │   ├── audit.ts              # Audit logging
│   │   │   ├── auth.ts
│   │   │   └── validation.ts         # Server-side validation
│   │   └── client/
│   │       ├── hooks.ts              # TanStack Query hooks
│   │       ├── queries.ts            # Query key factories
│   │       └── mutations.ts          # Mutation definitions
│   │
│   ├── schemas/                      # Zod schemas (shared)
│   │   └── index.ts                  # (already created)
│   │
│   ├── types/                        # TypeScript types
│   │   ├── database.ts               # Prisma-generated + custom types
│   │   ├── api.ts                    # API response types
│   │   └── forms.ts                  # Form types
│   │
│   ├── constants/                    # (existing, enhance)
│   │   └── index.ts
│   │
│   ├── hooks/                        # React hooks (move to lib/client eventually)
│   │   ├── useMarksSync.ts           # (refactor to TanStack Query)
│   │   ├── useMarksValidation.ts
│   │   ├── useMarksStats.ts
│   │   └── index.ts
│   │
│   ├── middleware.ts                 # Next.js middleware (auth check)
│   └── styles/                       # (unchanged)
│
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── migrations/                   # Migration history
│   └── seed.ts                       # Seed script
│
├── .env.local                        # Local env (git ignored)
├── .env.example                      # Example env template
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts                # (unchanged mostly)
├── postcss.config.mjs                # (unchanged)
├── package.json
└── pnpm-workspace.yaml               # (remove if single package)
```

---

## Migration Steps

### Step 1: Setup Next.js Project
```bash
# Create new Next.js project with App Router
pnpm create next-app@latest academia --typescript --app

# Add existing dependencies
pnpm add @radix-ui/* lucide-react recharts react-hook-form sonner tailwind-merge clsx
pnpm add -D tailwindcss postcss autoprefixer @types/react
```

### Step 2: Copy & Adapt Existing Code
- Copy `src/components/ui/` → `src/components/ui/`
- Copy `src/styles/` → `src/app/` and global styles
- Copy `src/constants/` → `src/constants/`
- Adapt layouts to Next.js pattern

### Step 3: Setup Database & Prisma
```bash
pnpm add @prisma/client prisma zod
pnpm prisma init
# Configure DATABASE_URL in .env.local
pnpm prisma migrate dev --name init
```

### Step 4: Install TanStack Query & Validation
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

### Step 5: Build API Routes
- Start with `/api/auth/*`
- Then `/api/marks/*`
- Then `/api/requests/*`
- Implement error handling & validation

### Step 6: Implement Middleware
- Create `middleware.ts` for auth checks
- Redirect unauthenticated users to login

### Step 7: Frontend Integration
- Replace mock data with real API calls
- Integrate TanStack Query
- Add error boundaries
- Test workflows

---

## Key Changes from Vite to Next.js

| Aspect | Vite | Next.js |
|--------|------|---------|
| **Entry Point** | `main.tsx` → `createRoot()` | `app/layout.tsx` → Server Components |
| **Routing** | React Router | Built-in File Router |
| **API** | External backend | `/app/api` routes |
| **State Mgmt** | useState + hooks | Server/Client Components + TanStack Query |
| **Styling** | Tailwind standalone | Tailwind + CSS modules |
| **Auth** | Manual JWT | Middleware + Session |
| **Server Logic** | N/A (frontend only) | Server Actions / Route Handlers |
| **Deployment** | SPA static | Full-stack Vercel |

---

## Configuration Files to Update

### `package.json`
```json
{
  "name": "academia",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@prisma/client": "^5.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zod": "^3.22.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "@supabase/supabase-js": "^2.38.0"
    // ... rest of deps
  },
  "devDependencies": {
    "prisma": "^5.0.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^4.0.0",
    "postcss": "^8.0.0"
  }
}
```

### `.env.example`
```
# Database
DATABASE_URL=postgresql://...@db.supabase.co/postgres

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL=https://....supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Auth Secret
AUTH_SECRET=...

# API
API_URL=http://localhost:3000
```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noImplicitAny": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

## Phased Implementation Timeline

- **Day 1**: Next.js setup + Prisma config + Supabase connection
- **Day 2-3**: Database schema + Auth routes + Middleware
- **Day 3-4**: Core API routes (marks, requests, classes)
- **Day 4-5**: Frontend pages + TanStack Query integration
- **Day 5-6**: Error handling + retry logic + testing
- **Day 6-7**: Deployment + production hardening
