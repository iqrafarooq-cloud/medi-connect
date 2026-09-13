---
name: MediConnect
description: Calm Humanist Clinical portal for clinic pre-arrival and patient intake
colors:
  primary: "#0e6251"
  primary-foreground: "#ffffff"
  background: "#ffffff"
  foreground: "#131e1b"
  card: "#ffffff"
  muted: "#f4f6f5"
  muted-foreground: "#5a6561"
  accent: "#eef6f3"
  accent-foreground: "#0e6251"
  secondary: "#e8f0f1"
  secondary-foreground: "#2a5458"
  secondary-brand: "#4e878c"
  tertiary: "#0284c7"
  destructive: "#ba1a1a"
  border: "#dfe5e2"
  sidebar: "#ffffff"
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

Single light theme clinical portal on a **white** canvas. Brand expression is restrained forest teal; secondary slate-teal and tertiary clinical blue support wayfinding and info—not decoration. Urgency color is reserved for true ESI-1 / destructive moments.

## Colors

- **Primary teal** (`#0e6251`) for brand, primary actions, and ESI-4 / available states.
- **White background** (`#ffffff`) for the main work surface; cards match the canvas with border-defined edges.
- **Secondary brand** (`#4e878c`) for charts, bay-in-care indicators, and muted clinical accents.
- **Tertiary blue** (`#0284c7`) for informational emphasis (AI assistant, links, chart-3).
- **Neutral** (`#5a6561`) for secondary text and calm borders.
- **Destructive / ESI 1** (`#ba1a1a`) only for critical inbound and fail states.

## Typography

- Headings: Plus Jakarta Sans, semibold, slight negative tracking.
- Body/UI: Inter.
- ETAs and vitals use tabular numerals.

## Layout

- Portal shell: fixed viewport height; white sidebar with border; `main` scrolls on white.
- Live feed: critical stage owns the first band; KPI cards summarize inbound/bays; queue and bay ops below.
- Desktop-first; stack on narrow viewports.

## Components

- Shared shadcn primitives from `@medi-connect/ui` (Button, Card, Table, Sheet, Avatar, etc.).
- Mobile nav uses Sheet; desktop uses bordered sidebar.

## Do's and Don'ts

**Do**

- Label synthetic telemetry and AI insights as stubs.
- Put the next clinical decision in the first viewport.
- Keep severity color meaningful.

**Don't**

- Reintroduce mint page washes behind Operate surfaces.
- Use red or blue as generic decoration outside their roles.
