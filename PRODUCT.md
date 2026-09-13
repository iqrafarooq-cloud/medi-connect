# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary users are clinic and hospital intake / ED staff (owner account in v1) working at a desk or wall display. Job: monitor patients en route, triage by severity and ETA, and ready bays and clinical leads before arrival.

Patients do not log into this portal; their identity lives in a global patient store (CNIC).

## Product Purpose

MediConnect is a healthcare triage and management platform that bridges emergency patient need and clinical readiness. The clinic portal prepares facilities for incoming emergencies through a pre-arrival live feed and related intake workflows, while supporting global patient lookup/registration and stub surfaces for triage command and AI history assist.

Success for the live feed: staff can scan inbound severity/ETA in seconds, prep the right bay, and act on the critical case first.

## Positioning

Pre-arrival emergency alert + critical data packet to the selected clinic (identity, blood type, complaint, ETA) so the facility is ready before the patient arrives — not a generic post-arrival EMR dashboard.

## Operating Context

Pakistan clinic/hospital facilities. Portal is authenticated (Better Auth). Live feed, triage command, and AI assistant ship as responsive UI stubs with mock data until realtime backends exist. Neighboring flows: patient search/register (real API), longitudinal patient record UI, live triage bay stubs.

## Capabilities and Constraints

- Confirmed now: clinic auth/onboarding, patient CNIC search/create, file metadata, live-feed and triage UI stubs.
- Out of scope this phase: real WebSockets, mapping/ETA APIs, FHIR wiring, multi-staff RBAC beyond single clinic owner, patient-facing web login.
- Terminology: inbound queue, ESI severity, ETA, bay readiness, clinical leads, CDS AI stubs labeled as stubs.
- Open: realtime alert channels (push/SMS/voice) remain product vision, not implemented.

## Brand Commitments

- Product name: MediConnect
- Incumbent visual system in the portal: “Calm Humanist Clinical” (primary `#0e6251`, white canvas, secondary `#4e878c`, tertiary `#0284c7`, Plus Jakarta Sans + Inter).
- Source vision: Healthcare Triage & Management PRD (`Healthcare_Triage_Management_PRD.pdf`) and clinic portal design spec.

## Evidence on Hand

- `Healthcare_Triage_Management_PRD.pdf` — product vision and pre-arrival alert requirements
- `docs/superpowers/specs/2026-09-12-mediconnect-clinic-portal-design.md` — portal routes and Stitch theme
- Mock inbound patients / bays on `/dashboard` and `/triage` (synthetic demonstration data only)

## Product Principles

1. Pre-arrival readiness beats post-arrival catch-up.
2. Severity and time must be scannable under pressure.
3. Never invent clinical claims or live telemetry; stub clearly when mocked.
4. Global patient identity (CNIC) is shared; facility ops stay local.
5. Earn trust with calm clinical craft, not decorative urgency theater.

## Accessibility & Inclusion

No product-specific legal accessibility standard locked yet; follow WCAG-minded defaults (contrast, focus, keyboard) for clinic staff on desktop-first monitors with usable mobile fallback.
