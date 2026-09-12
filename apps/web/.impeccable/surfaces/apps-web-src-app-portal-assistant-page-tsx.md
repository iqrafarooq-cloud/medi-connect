---
version: 1
slug: "apps-web-src-app-portal-assistant-page-tsx"
primary_target: "apps/web/src/app/(portal)/assistant/page.tsx"
related_targets: []
---

# Surface: /assistant Clinical History Assistant

Mode: Operate
Audience: clinic/ED physicians and intake clinicians
Job: select a patient, ask document-grounded history questions, verify citations against source records, switch patients without leaving the workspace
Constraints: MediConnect teal/mint identity; RAG/backend stub labeled honestly; portal shell nav unchanged; no invented FHIR certification claims

## Direction contract

THESIS: Evidence desk — patient context owns the top rail; chat and source document sit as equal dual rails so every answer is checkable against the record — refuses a lone chat card with citations as afterthought.

OWN-WORLD: MediConnect Calm Humanist Clinical — teal `#0e6251`, mint ground, white work panels, citation chips in primary teal; Plus Jakarta headings, Inter body; bordered dual panes, no nested card stacks.

STORY: Clinician picks (or switches) a patient, asks about allergies/meds/history, reads a structured stub answer with clickable citations, and confirms the verbatim passage in the document pane before accepting into a note.

FIRST VIEWPORT: Compact patient context bar (name+age, sync stub, Switch Patient, Upload). Below: two rounded white work cards on mint ground — left Clinical History Assistant (~55%), right Source Document Viewer (~45%). Empty state when no patient.

FORM: Evidence Dual Rail cards (reference-led Operate); seed key `assistant-evidence-2026`. Signature interaction: citation chip / grounded citation list → document tab + verbatim grounding pulse.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
