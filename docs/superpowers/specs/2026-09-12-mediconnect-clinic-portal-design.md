# MediConnect Clinic Portal — Design Spec

**Date:** 2026-09-12  
**Project:** MediConnect (Healthcare Triage & Management)  
**Scope:** `apps/web` clinic/hospital portal (no patient-facing web login)  
**Design source:** [Stitch — Clinical Care Portal](https://stitch.withgoogle.com/projects/3452591350126471749) (theme + triage/record/assistant screens; layout spacing improved)

## 1. Goals

Build a responsive clinic/hospital portal where:

1. Clinics and hospitals can **register** and **log in** (real auth + backend).
2. Clinic verification **documents** upload to Supabase Storage.
3. **Patients are global** — shared across all facilities, uniquely identified by **CNIC**.
4. Clinic staff can **register / look up patients** (real backend).
5. Large triage / AI / live-feed features ship as **responsive UI stubs** with mock data.
6. Visual language follows Stitch “Calm Humanist Clinical” (teal `#0e6251`, mint surfaces, Plus Jakarta Sans + Inter) with **more spacing** than the congested Stitch frames.

Out of scope for this phase: Expo/native app work, real-time WebSocket alerts, RAG/AI backend, mapping/ETA APIs, FHIR, multi-staff RBAC beyond a single clinic owner account.

## 2. Architecture

**Stack (existing monorepo):** Next.js (`apps/web`), Better Auth, Drizzle + PostgreSQL, oRPC, shared shadcn UI (`packages/ui`), Tailwind, Turborepo.

**Approach:** Domain tables + Better Auth + Supabase Storage.

```
Browser (clinic staff)
  → Next.js App Router pages
  → Better Auth (session cookies)
  → oRPC / API routes
  → Postgres (Drizzle): users, clinics, patients, file metadata
  → Supabase Storage: binary files (clinic docs + patient files)
```

### 2.1 Routes

| Route | Backend | Description |
|-------|---------|-------------|
| `/login` | Yes | Clinic email + password |
| `/register` | Yes | Multi-step clinic/hospital onboarding + doc uploads |
| `/dashboard` | Session + stub data | Live ETA / incoming-patient feed UI |
| `/patients` | Yes | Global search by CNIC / name |
| `/patients/new` | Yes | CNIC lookup → create or continue global patient |
| `/patients/[id]` | Stub | Longitudinal record / timeline UI |
| `/triage` | Stub | Pre-arrival triage command (spaced Stitch redesign) |
| `/assistant` | Stub | Physician AI EHR assistant UI |

Unauthenticated access to protected routes redirects to `/login`.

### 2.2 Actors

- **Clinic / hospital staff** (portal users): register facility, upload credentials, manage patient intake, view stub dashboards. Portal access requires `clinic.status === active` after admin approval.
- **System admin** (single): env-configured `ADMIN_EMAIL` / `ADMIN_PASSWORD`; signs in at `/admin/login`; reviews clinic documents and approves, rejects, or removes facilities.
- **Patients:** no portal login. Identity lives in the global patient store; files live under their patient folder in Supabase.

## 3. Data model

### 3.1 Auth (existing Better Auth tables)

Use existing `user`, `session`, `account`, `verification` from `packages/db/src/schema/auth.ts`.

- Email + password enabled.
- One primary **owner** user per clinic in v1 (no org plugin / multi-role yet).

### 3.2 Clinic (facility-local)

`clinic`

| Column | Notes |
|--------|-------|
| `id` | PK |
| `ownerUserId` | FK → `user.id` (unique in v1) |
| `name` | Facility name |
| `type` | `clinic` \| `hospital` |
| `address` | Street / area |
| `city` | City (Pakistan) |
| `ownerName` | Contact / owner display name |
| `phone` | Normalized `+92…` |
| `licenseNumber` | Medical license / registration number |
| `status` | `pending_verification` \| `active` \| `rejected` |
| `createdAt` / `updatedAt` | |

`clinic_document` (metadata only; bytes in Supabase)

| Column | Notes |
|--------|-------|
| `id` | PK |
| `clinicId` | FK → `clinic` |
| `docType` | e.g. `medical_license`, `accreditation` |
| `bucket` | `clinic-documents` |
| `storagePath` | Object key |
| `fileName` | Original name |
| `mimeType` | `application/pdf`, `image/jpeg`, `image/png` |
| `sizeBytes` | |
| `uploadedAt` | |

### 3.3 Patient (global)

`patient` — **not** owned by a single clinic.

| Column | Notes |
|--------|-------|
| `id` | PK (UUID/text) |
| `cnic` | **Unique**, 13 digits stored without dashes |
| `fullName` | |
| `dateOfBirth` | |
| `gender` | |
| `bloodType` | Optional |
| `phone` | Optional `+92…` (not unique) |
| `emergencyContactName` | Optional |
| `emergencyContactPhone` | Optional `+92…` |
| `notes` | Optional intake notes |
| `createdAt` / `updatedAt` | |
| `createdByUserId` | FK → user who first registered them |
| `createdByClinicId` | FK → clinic of first registration (audit only; not ownership) |

`patient_file` (metadata for reports, prescriptions, labs, etc.)

| Column | Notes |
|--------|-------|
| `id` | PK |
| `patientId` | FK → global `patient` |
| `uploadedByClinicId` | FK → `clinic` (which facility added the file) |
| `uploadedByUserId` | FK → `user` |
| `category` | `report` \| `prescription` \| `lab` \| `imaging` \| `other` |
| `bucket` | `patients` |
| `storagePath` | Object key |
| `fileName` / `mimeType` / `sizeBytes` / `uploadedAt` | |

Optional later (stub UIs may pretend): `patient_visit` / encounter linking clinic ↔ patient for “incoming now” feeds. Not required for v1 wired APIs.

### 3.4 Identity rules

- **CNIC** is the sole unique patient key (option A). Accept `xxxxx-xxxxxxx-x` in UI; normalize to 13 digits.
- Duplicate CNIC on create → return existing global patient (no second row).
- Pakistan phone: accept `03XXXXXXXXX` or `+923XXXXXXXXX`; store as `+92` + 10 digits.

## 4. Supabase Storage

Two private buckets:

### 4.1 `clinic-documents`

Path convention:

```
clinics/{clinicId}/{docType}/{uuid}-{safeFileName}
```

Used for medical license, accreditation, and other facility verification files at registration (and later profile updates).

### 4.2 `patients`

Path convention:

```
patients/{patientId}/reports/{uuid}-{safeFileName}
patients/{patientId}/prescriptions/{uuid}-{safeFileName}
patients/{patientId}/labs/{uuid}-{safeFileName}
patients/{patientId}/imaging/{uuid}-{safeFileName}
patients/{patientId}/other/{uuid}-{safeFileName}
```

All clinics may upload into a patient’s folder when treating them; object metadata in `patient_file` records which clinic uploaded what. Patient identity and file tree remain global.

### 4.3 Access pattern

- Buckets are **private**.
- Server uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (never expose service role to the browser).
- Uploads happen on authenticated API routes after session + clinic checks.
- Clients receive **short-lived signed URLs** for download/preview.
- Allowed MIME: PDF, JPEG, PNG; max ~10MB per file (configurable).

Env (server): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, optional `SUPABASE_CLINIC_BUCKET=clinic-documents`, `SUPABASE_PATIENT_BUCKET=patients`.

## 5. Auth & registration flows

### 5.1 Clinic register (`/register`)

Multi-step, spacious UI:

1. **Facility** — name, type, address, city  
2. **Owner** — name, email, password, `+92` phone  
3. **Documents** — license number + at least one file to `clinic-documents`  
4. **Review** — submit  

On submit (transactional where possible):

1. Create Better Auth user (email/password).  
2. Create `clinic` with `status: pending_verification`.  
3. Upload files to Supabase; insert `clinic_document` rows.  
4. Sign out; redirect to `/register/pending` (awaiting admin verification — no portal access yet).  

Re-registering with an email that already has a `pending_verification` or `rejected` clinic returns an error directing the user to contact MediConnect at `info@mediconnect.com`.

Rollback / compensating cleanup if mid-flow fails (avoid orphan clinic without owner, or orphan uploads without DB rows).

### 5.2 Login (`/login`)

Email + password via Better Auth. After sign-in, gate on clinic status:

- `active` → portal  
- `pending_verification` → sign out; awaiting verification message  
- `rejected` → sign out; rejection message with `info@mediconnect.com`  
- Admin email → sign out; redirect to use `/admin/login`  

No patient self-serve login.

### 5.2a Admin (`/admin/login`, `/admin`)

Single system admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Tabs for pending / approved / rejected clinics; detail view with signed document URLs; approve, reject, or remove.

### 5.3 Patient registration / lookup (`/patients`, `/patients/new`)

1. Staff enters CNIC → search global `patient`.  
2. **Found:** show profile; allow “continue” / open record; optional file upload into `patients/{id}/…`.  
3. **Not found:** create global patient; optional initial report upload.  
4. List/search page supports CNIC and name queries for authenticated clinics.

Patient file upload UI can be minimal in v1 (one “Reports / prescriptions” uploader on create or detail), but storage + `patient_file` schema must exist so later prescription/history features land in the right place.

## 6. UI / theme

- Apply Stitch tokens: primary teal (`#0e6251` / `#00493b`), mint surfaces (`#f0fcf7` family), soft roundness, high-contrast text.
- Typography: Plus Jakarta Sans (headlines) + Inter (body) — avoid default Inter-only sterile look; keep clinical calm.
- **Spacing:** increase section gaps, form field spacing, and card padding vs Stitch denseness; mobile-first breakpoints throughout.
- Authenticated shell: sidebar (desktop) / drawer (mobile) with nav to Dashboard, Triage, Patients, Assistant.
- Stub pages use realistic mock Pakistani names, CNIC-shaped IDs, and ETA copy — no live sockets.

## 7. API surface (indicative)

oRPC (or Next route handlers where upload streaming is simpler):

- `clinic.register` / auth sign-up + clinic create  
- `clinic.me` — current clinic profile  
- `clinic.uploadDocument`  
- `patient.searchByCnic` / `patient.search`  
- `patient.create`  
- `patient.get`  
- `patient.uploadFile`  
- `patient.listFiles`  

Stub pages do not require live alert/AI endpoints.

## 8. Errors & security

- Clear field-level validation (CNIC, phone, required docs).  
- Auth errors: invalid credentials, email already registered.  
- Session required for all patient and upload endpoints.  
- Path traversal blocked; filenames sanitized.  
- Service role key server-only.  
- Do not commit `.cursor/mcp.json` or Supabase/Stitch secrets; keep them in `.env` / gitignored config.

## 9. Testing

- Unit: CNIC + phone normalizers / validators; clinic login gate + registration blocked messages.  
- Smoke: register clinic → pending page → admin approves at `/admin` → clinic login succeeds → search missing CNIC → create patient → re-search finds same → upload patient file to `patients` bucket → stub routes render at mobile and desktop widths.  
- Smoke reject path: admin rejects → clinic login shows contact `info@mediconnect.com` → re-register shows already-registered-not-approved message.

## 10. Implementation phases (for planning)

1. Theme tokens + auth pages (login/register) + layout shell.  
2. Drizzle schemas + migrations; Supabase buckets provisioning docs.  
3. Clinic register/login + document upload wiring.  
4. Global patient CNIC search/create + patient file upload.  
5. Responsive stub pages: dashboard feed, triage, record timeline, AI assistant (Stitch-inspired, spacious).  
6. Validation utilities + smoke checklist.

## 11. Decisions log

| Decision | Choice |
|----------|--------|
| Portal audience | Clinics/hospitals only |
| Patient accounts on web | None |
| Patient identity | Global DB, unique CNIC |
| Phone | Pakistan `+92` only |
| File storage | Supabase: `clinic-documents` + `patients` buckets |
| Auth depth | Real Better Auth for clinic + patient CRUD; stubs for triage/AI/live ETA |
| Admin access | Single env admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), separate `/admin` portal |
| Clinic verification | `pending_verification` → admin approve (`active`) or reject (`rejected`); login gated |
| Apps | `apps/web` only |
| Design | Stitch Clinical Care Portal theme; increase spacing |
| Clinic docs | Form fields + real file upload (option B) |
| Architecture approach | Domain tables + Better Auth + Supabase (approach 1) |
