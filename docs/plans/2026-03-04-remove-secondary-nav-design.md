# Remove Secondary Nav Bar — Design

## Problem
The secondary nav bar (black bar below header) shows a single tab for most sections, adding visual clutter with no value. Only Offense & Arrest has 2 pages; CFS should have 2 (time-of-day is missing from nav).

## Solution
1. **Remove secondary nav bar** from header entirely
2. **Add inline page toggle** (reusable `PageToggle` component) at top of multi-page sections
3. **Add CFS time-of-day** to `DOMAIN_SECTIONS` so it appears in toggle and mobile menu
4. **Simplify mobile menu** — single-page sections link directly instead of collapsible groups

## Page Toggle Component
- Reusable `src/components/ui/page-toggle.tsx`
- Renders `<Link>` elements styled as pill buttons (same visual as map layers)
- Active: `bg-primary text-white border-primary`
- Inactive: `bg-white text-foreground border-border hover:bg-muted`
- Used on: offense-arrest/overview, offense-arrest/arrests, cfs-311/overview, cfs-311/time-of-day

## Files Changed
- `src/components/layout/header.tsx` — remove secondary nav bar, simplify mobile menu
- `src/components/ui/page-toggle.tsx` — new reusable component
- `src/lib/jurisdictions.ts` — add time-of-day to CFS pages
- `src/app/[jurisdiction]/(sections)/offense-arrest/overview/page.tsx` — add PageToggle
- `src/app/[jurisdiction]/(sections)/offense-arrest/arrests/page.tsx` — add PageToggle
- `src/app/[jurisdiction]/(sections)/cfs-311/overview/page.tsx` — add PageToggle
- `src/app/[jurisdiction]/(sections)/cfs-311/time-of-day/page.tsx` — add PageToggle

## What stays the same
- Primary nav bar, route structure, all URLs, page content, data flow
