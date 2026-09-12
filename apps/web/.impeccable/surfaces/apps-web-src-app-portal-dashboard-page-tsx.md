---
version: 1
slug: "apps-web-src-app-portal-dashboard-page-tsx"
primary_target: "apps/web/src/app/(portal)/dashboard/page.tsx"
related_targets: []
---

# Surface: /dashboard Live Feed

Mode: Operate
Audience: clinic/ED intake staff
Job: scan inbound severity/ETA, prep bay, act on critical first
Constraints: MediConnect teal/mint identity; mock data labeled as stubs; portal shell unchanged

## Direction contract

THESIS: Critical owns the top band as the only next decision; queue and bay prep share the lower half as equal rails — refuses a uniform card stack where every inbound case competes equally.

OWN-WORLD: MediConnect Calm Humanist Clinical — teal `#0e6251`, mint ground `#f0fcf7`, white work surfaces, destructive `#ba1a1a` for ESI 1 / critical only; Plus Jakarta headings, Inter body; soft borders, no nested cards.

STORY: Staff arrive seeing who is about to land and what to do; then scan the rest of the queue while bay prep stays visible without scrolling past the critical case.

FIRST VIEWPORT: Full-bleed critical stage (patient, complaint, live ETA chase numeral, single Acknowledge & Assign action). Slim KPI strip beneath. Below: left inbound queue (ESI-coded rows), right bay grid + prep checklist + leads at equal column weight.

FORM: Split Attention Board (grounded list index 7); seed key `8f92fc3b`. Raises: wayfinding one-decision band; drum-machine ETA as running “now.”

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
