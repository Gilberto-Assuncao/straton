# STRATON --- THEMING GUIDE

Version: 1.0 Status: Active Last Updated: 2026-07-21

# Purpose

This guide defines the official theming strategy for STRATON, ensuring
visual consistency while enabling future customization for customers and
enterprise tenants.

------------------------------------------------------------------------

# Theme Strategy

-   Default theme: Dark Mode
-   Future support: Light Mode
-   Theme values must be driven by design tokens.
-   UI components must never hardcode colors.

------------------------------------------------------------------------

# Theme Architecture

Themes are composed of:

-   Color tokens
-   Typography tokens
-   Elevation
-   Borders
-   Shadows
-   Semantic colors

All themes consume the same token names with different values.

------------------------------------------------------------------------

# Default Theme

## Dark Mode

Characteristics:

-   Dark premium background
-   High contrast text
-   Green primary actions
-   Low visual noise

Primary colors:

-   Background: #111827
-   Surface: #161A34
-   Foreground: #E5E7EB
-   Primary: #22C55E

------------------------------------------------------------------------

# Future Theme

## Light Mode

Guidelines:

-   Preserve hierarchy
-   Maintain semantic colors
-   Keep identical spacing and typography
-   Ensure WCAG 2.2 AA compliance

------------------------------------------------------------------------

# CSS Variables

Expose theme values through CSS custom properties.

Example token groups:

-   --background
-   --surface
-   --foreground
-   --primary
-   --border
-   --muted

------------------------------------------------------------------------

# Tailwind Integration

-   Map CSS variables into Tailwind configuration.
-   Prefer utility classes over inline styles.
-   Avoid duplicate color definitions.

------------------------------------------------------------------------

# User Preferences

Theme preference should:

-   Persist between sessions.
-   Respect system preference on first visit.
-   Be overridable by the user.

------------------------------------------------------------------------

# Tenant Branding

Future Enterprise support may allow:

-   Custom logo
-   Primary accent color
-   Company favicon
-   Login branding

Branding must never affect accessibility or usability.

------------------------------------------------------------------------

# Development Rules

-   Never reference raw color values in reusable components.
-   Always consume design tokens.
-   Test both themes before release.
-   Document new theme tokens.

------------------------------------------------------------------------

# Goal

Provide a scalable theming architecture that supports future
customization while preserving the STRATON visual identity and
accessibility standards.
