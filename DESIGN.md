---
name: MediConnect
description: Calm Humanist Clinical portal for clinic pre-arrival and patient intake
colors:
  primary: "#0e6251"
  primary-foreground: "#ffffff"
  background: "#f0fcf7"
  foreground: "#131e1b"
  card: "#ffffff"
  muted: "#e5f1eb"
  muted-foreground: "#3f4945"
  accent: "#d8f3ea"
  accent-foreground: "#00493b"
  secondary: "#e5f1eb"
  secondary-foreground: "#00493b"
  destructive: "#ba1a1a"
  border: "#c5d4cd"
  sidebar: "#ebf6f1"
  esi-1: "#ba1a1a"
  esi-2: "#c45c26"
  esi-3: "#a67c00"
  esi-4: "#0e6251"
typography:
  heading:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 400
    fontSize: "0.875rem"
    lineHeight: 1.5
  data:
    fontFamily: "Plus Jakarta Sans, ui-sans-serif, system-ui, sans-serif"
    fontVariantNumeric: "tabular-nums"
rounded:
  sm: "0.375rem"
  md: "0.625rem"
  lg: "0.75rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.25rem"
  xl: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    height: "2.5rem"
  button-critical:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
  surface-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
---

# MediConnect Design System

## Overview

Single light theme clinical portal. Brand expression is restrained teal on mint; urgency color is reserved for true ESI-1 / destructive moments. Operate surfaces prioritize scanability under time pressure.

## Colors

- **Primary teal** (`#0e6251`) for brand, primary actions, and available/success states.
- **Mint background** (`#f0fcf7`) and sidebar (`#ebf6f1`) as calm work surfaces.
- **White cards** for interactive work regions.
- **Destructive / ESI 1** (`#ba1a1a`) only for critical inbound and fail states.
- ESI 2–4 use warm orange, gold, and primary teal respectively — never decorative accents outside severity meaning.

## Typography

- Headings: Plus Jakarta Sans, semibold, slight negative tracking.
- Body/UI: Inter.
- ETAs and vitals use tabular numerals.
- No display serifs or costume mono for clinical UI.

## Layout

- Portal shell: fixed viewport height; left nav pinned; `main` scrolls.
- Live feed (`/dashboard`): Split Attention Board — critical stage owns the first band; inbound queue and bay ops share equal lower rails.
- Dense Operate density; group by proximity before wrapping every block in a card.
- Desktop-first dual rail; stack on narrow viewports.

## Elevation & Depth

- Prefer 1px border + soft soft shadow on interactive surfaces.
- Critical stage is a full-bleed color field, not a floating card.
- No zero-offset glow halos; no hard offset neo-brutal shadows.

## Shapes

- Radius ~10–12px on panels (`0.625rem` system radius).
- Small controls may be slightly tighter; avoid pill shapes for large containers.

## Components

- Shared shadcn primitives from `@medi-connect/ui`.
- Live feed queue rows expand selected patient’s vitals inline rather than nesting card-in-card.
- Bay tiles are flat bordered cells with status dots.
- Disabled secondary actions remain visible as stubs until backends exist.

## Do's and Don'ts

**Do**

- Label synthetic telemetry and AI insights as stubs.
- Put the next clinical decision in the first viewport.
- Keep MediConnect teal identity on Operate surfaces.

**Don't**

- Invent live WebSocket or FHIR claims.
- Use eyebrow/kicker labels above headings.
- Scatter equal-weight cards that erase priority hierarchy.
- Treat red as a general accent outside critical/ESI 1.
