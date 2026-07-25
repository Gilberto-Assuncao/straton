# STRATON --- DESIGN PRINCIPLES (POLICY)

Version: 1.0 Status: Active Last Updated: 2026-07-21

Binding design rules every contributor and AI must follow. See [../03-design/DESIGN_README.md](../03-design/DESIGN_README.md) for the full design documentation set.

STRATON expresses **TIME WELL MANAGED** through clarity, confidence, efficiency, and restraint.

## Visual direction

- Maintain the premium dark identity and Poppins typography.
- Use the single official design system and centralized tokens.
- Do not duplicate primitives, colors, spacing scales, icon systems, or layout shells.
- Prefer strong hierarchy, calm surfaces, concise copy, and subtle motion.
- Keep demonstration content clearly labeled.

## Interaction

- Design mobile-first from 320px through ultrawide screens.
- Provide at least 44px touch targets, visible keyboard focus, semantic HTML, accessible names, sufficient contrast, and screen-reader-compatible status information.
- Never rely on color alone or require horizontal page scrolling.
- Use native controls and progressive enhancement before custom JavaScript.
- Respect reduced-motion preferences and avoid decorative animation that delays work.

## Reuse

Feature screens compose primitives, forms, data displays, tables, feedback, navigation, layouts, and App Shell components from `src/components`. New shared components require evidence that an equivalent does not exist and that at least one stable reusable responsibility has been identified.

See the [Design System](../03-design/DESIGN_SYSTEM.md).
