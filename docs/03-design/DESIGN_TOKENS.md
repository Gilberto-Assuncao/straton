# STRATON --- DESIGN TOKENS

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This document specifies the official design tokens used across the
STRATON ecosystem. Design tokens provide a single source of truth for
visual properties and ensure consistency between Figma, Tailwind CSS,
and application code.

------------------------------------------------------------------------

# Color Tokens

## Brand

  Token                   Value     Usage
  ----------------------- --------- ------------------
  color.primary           #22C55E   Primary actions
  color.primary.hover     #16A34A   Hover state
  color.background        #111827   Main background
  color.background.deep   #0F172A   Deep background
  color.surface           #161A34   Cards and panels
  color.border            #374151   Borders
  color.foreground        #E5E7EB   Primary text
  color.muted             #9CA3AF   Secondary text

## Semantic

  Token           Value
  --------------- ---------
  color.success   #22C55E
  color.warning   #F59E0B
  color.error     #EF4444
  color.info      #3B82F6

------------------------------------------------------------------------

# Typography Tokens

-   font.family.primary = Poppins
-   font.family.fallback = system-ui, sans-serif

## Font Sizes

-   text-xs = 12px
-   text-sm = 14px
-   text-base = 16px
-   text-lg = 18px
-   text-xl = 20px
-   text-2xl = 24px
-   text-3xl = 30px
-   text-4xl = 36px
-   text-5xl = 48px

------------------------------------------------------------------------

# Spacing Tokens

Base unit: **4px**

Scale:

-   space-1 = 4px
-   space-2 = 8px
-   space-3 = 12px
-   space-4 = 16px
-   space-6 = 24px
-   space-8 = 32px
-   space-12 = 48px
-   space-16 = 64px

------------------------------------------------------------------------

# Border Radius

-   radius-sm = 6px
-   radius-md = 10px
-   radius-lg = 16px
-   radius-xl = 24px

------------------------------------------------------------------------

# Shadow Tokens

-   shadow-sm
-   shadow-md
-   shadow-lg
-   shadow-xl

Shadows should remain subtle to reinforce the premium dark interface.

------------------------------------------------------------------------

# Motion Tokens

Default duration:

-   fast = 150ms
-   normal = 250ms
-   slow = 400ms

Default easing:

-   ease-out
-   ease-in-out

Animations should communicate state changes without distracting users.

------------------------------------------------------------------------

# Breakpoints

-   sm = 640px
-   md = 768px
-   lg = 1024px
-   xl = 1280px
-   2xl = 1536px

------------------------------------------------------------------------

# Z-Index Tokens

-   dropdown = 1000
-   sticky = 1100
-   overlay = 1200
-   modal = 1300
-   toast = 1400
-   tooltip = 1500

------------------------------------------------------------------------

# Implementation Guidelines

-   Expose tokens as CSS variables.
-   Mirror tokens in Tailwind configuration.
-   Keep Figma libraries synchronized with token values.
-   Never hardcode colors or spacing in reusable components.

------------------------------------------------------------------------

# Goal

Ensure visual consistency, simplify maintenance, and enable scalable UI
development across all STRATON applications.
