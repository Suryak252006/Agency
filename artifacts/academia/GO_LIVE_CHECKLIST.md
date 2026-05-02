# Academia — Go-Live Checklist

> **How to use:** Work top-to-bottom. Every item must be ticked before moving to the next section. Owner signs off at the end.

---

## 1. Pre-Deploy Checks

### Environment variables — confirm all are set in the Replit Deployment secrets panel

| Variable | Notes |
|---|---|
| `AUTH_SECRET` | Min 32-char random string. Never reuse the dev value. |
| `DATABASE_URL` | Auto-injected by Replit PostgreSQL. Verify it points to the **production** database. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (config only — not used for auth at runtime). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (config only). |
| `DEFAULT_SCHOOL_ID` | Must match the `schoolId` value seeded in the production database. |

### Code & build

```bash
# Zero TypeScript errors
cd artifacts/academia && npx tsc --noEmit

# All 41 E2E tests pass
npx vitest run tests/e2e/

# Production build succeeds
pnpm --filter @workspace/academia run build
```

- [ ] `tsc --noEmit` → **0 errors**
- [ ] `vitest run tests/e2e/` → **41 passed, 0 failed**
- [ ] `pnpm build` → **Compiled successfully**, 0 warnings

### Database

```bash
# Push schema to production DB (run once before first deploy)
pnpm --filter @workspace/academia exec prisma db push

# Seed the initial admin account (upsert-safe — safe to re-run)
pnpm --filter @workspace/academia exec node prisma/seed-admin.cjs
```

- [ ] `prisma db push` completed without errors
- [ ] Admin user seeded (`test@example.com` / `admin123`)
- [ ] **Default password noted** — will be changed immediately after first login (step 3)

---

## 2. Critical Smoke Tests

Run these manually against the **production URL** immediately after deployment. Target: < 5 minutes.

| # | Test | Pass criteria |
|---|---|---|
| 1 | `GET /api/health` | `200 OK`, body `{ "status": "healthy" }` |
| 2 | Login with wrong credentials | Toast error shown, no redirect, session cookie **not** set |
| 3 | Login as admin (`test@example.com`) | Redirects to `/admin`, dashboard loads with data |
| 4 | Login as faculty | Redirects to `/faculty`, dashboard loads with data |
| 5 | Admin → Roles & Permissions | Table renders with rows (was a previously broken section — not empty state) |
| 6 | Admin → Students | Page loads with student list |
| 7 | Admin → Requests | Page loads |
| 8 | Faculty → Classes | Page loads |
| 9 | Faculty → Marks | Page loads, marks table renders |
| 10 | Navigate to `/nonexistent-route` | Custom 404 page renders (not blank or Next.js default) |
| 11 | Navigate to `/admin` while **logged out** | Redirected to `/auth/login` |
| 12 | Navigate to `/faculty` as **admin** | Redirected (role guard enforced) |

---

## 3. Post-Deploy Checks

### Security headers
Verify with `curl -I https://<your-app>.replit.app` or browser DevTools → Network → response headers:

- [ ] `content-security-policy` present and contains `frame-ancestors 'none'`
- [ ] `strict-transport-security` present (`max-age=31536000; includeSubDomains`)
- [ ] `x-frame-options: DENY`
- [ ] `x-content-type-options: nosniff`
- [ ] `x-powered-by` header **absent** (suppressed by `poweredByHeader: false`)

### Session cookie
Open DevTools → Application → Cookies after login:

- [ ] Cookie name: `app_session`
- [ ] `HttpOnly` flag: **yes** (not readable from JavaScript)
- [ ] `Secure` flag: **yes** (HTTPS-only)
- [ ] `SameSite`: `Lax`

### Credentials hygiene

- [ ] Change admin password from `admin123` to a strong unique password immediately after first login
- [ ] Confirm `seed.js` (the destructive full-data seed) is **not** referenced in any npm/pnpm script

---

## 4. Monitoring Checks

Set these up before going live, not after.

| Monitor | Recommended config |
|---|---|
| **Uptime check** | Poll `GET /api/health` every 60 s. Alert if `status != "healthy"` for 2 consecutive checks. |
| **Deployment logs** | Watch Replit deployment logs for the first 30 min post-deploy. Alert on any unhandled 500/503 spike. |
| **Auth endpoint** | Alert if `POST /api/auth/login` error rate > 5% over a 5-min window (possible DB or secret misconfiguration). |
| **Session errors** | Alert on repeated 401 responses from authenticated API routes (may indicate `AUTH_SECRET` mismatch). |

---

## 5. Rollback Triggers

Initiate rollback **immediately** if any of the following occur post-deploy:

| Trigger | Threshold |
|---|---|
| `/api/health` returns `unhealthy` | 2 consecutive checks (2 minutes) |
| Login endpoint returning 500 | Any occurrence in first 15 min |
| Database connection errors in logs | Any occurrence |
| Session cookies not being set after successful login | Confirmed by 1 user report |
| Critical data visible to wrong school/tenant | Any confirmed instance |

---

## 6. Rollback Steps

```
1. Replit Deployments panel → select the previous successful deployment
2. Click "Rollback" → confirm
3. Wait for rollback deployment to go live (~60 s)
4. Verify: GET /api/health → { "status": "healthy" }
5. Verify: login flow completes end-to-end on rolled-back build
6. Notify stakeholders of rollback and estimated fix window
```

> **Note:** Database schema changes (`prisma db push`) are not automatically reversed by a code rollback.
> If the deploy included a schema change that caused the failure, you may need to manually revert the schema
> and re-push before traffic is stable. Evaluate before rollback if schema is involved.

---

## 7. Final Release Signoff

Complete every item. Last reviewer signs and dates at the bottom.

**Code quality**
- [ ] `tsc --noEmit` → 0 errors
- [ ] `vitest run tests/e2e/` → 41/41 pass
- [ ] `pnpm build` → 0 errors, 0 warnings

**Security**
- [ ] CSP, HSTS, X-Frame-Options headers verified in production
- [ ] Session cookie is `HttpOnly`, `Secure`, `SameSite=Lax` in production
- [ ] Health endpoint returns only `{ status, dbLatencyMs }` — no env or error details
- [ ] `AUTH_SECRET` is a strong unique value (not the dev default)
- [ ] Default admin password (`admin123`) has been changed

**Functionality**
- [ ] All 12 smoke tests passed against the production URL
- [ ] Admin — Roles & Permissions page shows role data (confirm the RBAC fix is live)
- [ ] Tenant isolation confirmed: Admin A cannot access School B data

**Operations**
- [ ] Uptime monitor configured for `/api/health`
- [ ] Deployment log alerts configured
- [ ] Rollback procedure understood by at least one team member
- [ ] `replit.md` reflects current architecture and known operational notes

---

**Released by:** _________________________ &nbsp;&nbsp; **Date:** _____________
