# STRATON --- DESIGN SYSTEM

Version: 1.1 Status: Completed (foundation), evolving Last Updated: 2026-07-21

## Structure

The official component library lives in `src/components`. It is independent from the existing feature components and can be adopted incrementally without changing current screens.

- `ui`: buttons and the standardized icon wrapper.
- `forms`: accessible fields and validation presentation.
- `data-display`: badges, avatars, progress, metrics, empty states, tooltip, popover, and accordion.
- `tables`: generic responsive data table.
- `dashboard`: composable dashboard cards.
- `cards`: reusable entity cards.
- `feedback`: alerts, overlays, dialogs, drawers, toast presentation, and loading states.
- `navigation`: breadcrumbs, menu items, dropdowns, tabs, pagination, and command palette.
- `timeline`: chronological activity display.
- `charts`: dependency-free accessible chart primitives.
- `maps`: visual placeholders for future map adapters.
- `layout`: responsive containers and stacks.

Use `@/src/components` for the public barrel or a category barrel when limiting the client dependency graph is important.

## Design tokens

`src/design-system/tokens.ts` centralizes colors, spacing, radii, typography, shadows, animation metadata, z-index, breakpoints, durations, and shared component classes. New components should extend these tokens instead of introducing repeated values. The palette preserves STRATON’s dark canvas, premium surface, green action color, Poppins typography, and accessible foreground colors.

## Component practices

- Keep business rules and domain vocabulary outside primitives.
- Prefer composition through `children`, render callbacks, and typed props.
- Use visible labels; error messages must connect through ARIA descriptions.
- Preserve a minimum 44px interaction target and visible keyboard focus.
- Use native HTML semantics before adding JavaScript.
- Add `"use client"` only to interactive entry points.
- Keep mobile card modes available for dense tables; never require page-level horizontal scrolling.
- Use the `Icon` wrapper rather than embedding icon implementations in pages.

## Forms

Inputs forward refs where appropriate and accept standard native props, making them compatible with future React Hook Form registration. `error`, `hint`, `aria-invalid`, and native constraint attributes support future Zod resolver output without coupling the library to either package.

## Data tables

`DataTable` is generic over its row type. It supports search, sortable columns, pagination, filters, row selection, bulk-action rendering, column visibility, desktop tables, and responsive cards. Consumers supply stable row identifiers and presentation callbacks.

## Naming and reuse

Primitive names describe behavior (`Button`, `Modal`, `DataTable`). Entity card aliases describe presentation only and accept generic content. Dashboard aliases carry a `Dashboard` prefix when needed to avoid barrel collisions. Screen-specific orchestration stays in feature components, not in the design system.

## Accessibility and responsiveness

Interactive components expose semantic roles, keyboard focus, accessible names, live or alert regions where relevant, and Escape handling for modal dialogs. Layouts are mobile-first and scale through tablet, desktop, and ultrawide breakpoints. Consumers remain responsible for focus restoration and full focus trapping when integrating complex modal workflows.
