# MediConnect Clinic Portal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a responsive MediConnect clinic web portal with real clinic auth/registration (Supabase doc uploads), global CNIC-based patients (Supabase patient files), and spacious Stitch-themed stub UIs for triage/dashboard/AI.

**Architecture:** Extend Better-T-Stack (Next.js web + Better Auth + Drizzle/Postgres + oRPC). Domain tables for clinic/patient; file bytes in Supabase buckets `clinic-documents` and `patients`; multipart upload via Next.js API routes; JSON CRUD via oRPC.

**Tech Stack:** Next.js 16, React 19, Tailwind 4, shadcn (`packages/ui`), Better Auth, Drizzle, oRPC, Zod, `@supabase/supabase-js`, Plus Jakarta Sans + Inter.

**Spec:** `docs/superpowers/specs/2026-09-12-mediconnect-clinic-portal-design.md`

## Global Constraints

- Web only (`apps/web`); do not change native app behavior beyond shared packages if required.
- Clinics/hospitals only — no patient portal login.
- Patients are global; unique key is 13-digit CNIC.
- Pakistan phones only (`+92`).
- Private Supabase buckets; service role server-only.
- Stub pages must be fully responsive with mock data.
- Theme: Calm Humanist Clinical teal `#0e6251`, mint surfaces, generous spacing.
- Do not commit `.cursor/mcp.json` or secrets.

## File map

| Path | Responsibility |
|------|----------------|
| `packages/db/src/schema/clinic.ts` | clinic + clinic_document tables |
| `packages/db/src/schema/patient.ts` | patient + patient_file tables |
| `packages/db/src/schema/index.ts` | re-exports |
| `packages/env/src/server.ts` | Supabase env vars |
| `packages/api/src/lib/pakistan.ts` | CNIC + phone normalize/validate |
| `packages/api/src/lib/supabase.ts` | server Supabase client + signed URLs |
| `packages/api/src/routers/clinic.ts` | clinic.me, registerClinic profile |
| `packages/api/src/routers/patient.ts` | search/create/get/listFiles |
| `packages/api/src/routers/index.ts` | mount routers |
| `apps/web/src/app/api/uploads/clinic-document/route.ts` | multipart clinic uploads |
| `apps/web/src/app/api/uploads/patient-file/route.ts` | multipart patient uploads |
| `packages/ui/src/styles/globals.css` | MediConnect theme tokens |
| `apps/web/src/components/portal/*` | shell, nav |
| `apps/web/src/app/(auth)/login` | login page |
| `apps/web/src/app/(auth)/register` | multi-step register |
| `apps/web/src/app/(portal)/*` | dashboard, patients, triage, assistant |

---

### Task 1: Validators + theme tokens

**Files:**
- Create: `packages/api/src/lib/pakistan.ts`
- Create: `packages/api/src/lib/pakistan.test.ts` (or colocate under `packages/api` if vitest exists; else `apps/web` node assert script — prefer simple node:test)
- Modify: `packages/ui/src/styles/globals.css`
- Modify: `apps/web/src/app/layout.tsx` (fonts + metadata)
- Modify: `.gitignore` (ignore `.cursor/`)

**Produces:** `normalizeCnic`, `isValidCnic`, `normalizePakistanPhone`, `isValidPakistanPhone`

- [ ] **Step 1:** Implement pakistan helpers with node:test and run them.
- [ ] **Step 2:** Apply teal/mint CSS variables; Plus Jakarta Sans + Inter in root layout; MediConnect metadata.
- [ ] **Step 3:** Commit.

### Task 2: Schema + env + Supabase client

**Files:**
- Create: `packages/db/src/schema/clinic.ts`, `patient.ts`
- Modify: `packages/db/src/schema/index.ts`, `packages/env/src/server.ts`, `packages/auth/src/index.ts` (fix syntax if broken)
- Create: `packages/api/src/lib/supabase.ts`
- Modify: `packages/api/package.json`, root/workspace deps for `@supabase/supabase-js`
- Modify: `apps/web/.env.example` (create) documenting vars — do not write secrets into repo from `.env`

**Produces:** Drizzle models; `createSupabaseAdmin()`; env keys `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, bucket names.

- [ ] **Step 1:** Add schemas and push with `pnpm db:push` (requires DATABASE_URL).
- [ ] **Step 2:** Wire env + supabase helper.
- [ ] **Step 3:** Commit.

### Task 3: oRPC clinic + patient APIs + upload routes

**Files:**
- Create routers + upload routes as in file map
- Modify: `packages/api/src/routers/index.ts`

**Produces:**
- `clinic.me`, `clinic.registerProfile` (after auth signup on client, or server-side register endpoint)
- `patient.searchByCnic`, `patient.search`, `patient.create`, `patient.get`, `patient.listFiles`
- Upload routes returning `{ storagePath, fileId }`

Registration flow: client `authClient.signUp` then `clinic.registerProfile` + upload docs (or single API that creates clinic after session exists).

- [ ] **Step 1:** Implement routers + uploads.
- [ ] **Step 2:** Smoke typecheck.
- [ ] **Step 3:** Commit.

### Task 4: Auth pages (login + multi-step register)

**Files:**
- Create auth layout/pages under `apps/web/src/app`
- Add shadcn: `select`, `badge`, `separator`, `progress`, `sheet` as needed via `npx shadcn@latest add … -c packages/ui`

- [ ] **Step 1:** Build spacious login/register matching theme; PK phone field; file inputs.
- [ ] **Step 2:** Wire Better Auth + clinic profile + uploads.
- [ ] **Step 3:** Commit.

### Task 5: Portal shell + patient pages (wired)

**Files:**
- Portal layout with responsive sidebar/drawer
- `/patients`, `/patients/new`, optional file upload on patient

- [ ] **Step 1:** Shell + patient search/create CNIC flow.
- [ ] **Step 2:** Commit.

### Task 6: Stub pages (dashboard, triage, record, assistant)

**Files:**
- `/dashboard`, `/triage`, `/patients/[id]`, `/assistant` with mock Pakistani data, responsive, spacious

- [ ] **Step 1:** Implement stubs from Stitch structure (not congested).
- [ ] **Step 2:** Typecheck + commit.

---

## Spec coverage checklist

- Clinic register/login + docs → Tasks 3–4  
- Global CNIC patients → Tasks 1, 2, 5  
- Supabase clinic + patient buckets → Task 2–3  
- Responsive stubs → Task 6  
- Theme/spacing → Tasks 1, 4–6  
