# STRATON --- APP SHELL

Version: 1.1 Status: Completed Last Updated: 2026-07-21

## Architecture

The permanent interface infrastructure is located in `src/components/app-shell`. It is configuration-driven and contains no business rules, persistence, authentication decisions, or module-specific data fetching. Feature routes provide navigation, company, user, notification, quick-action, and breadcrumb view data through typed props.

The shell composes a responsive sidebar, global header, breadcrumb, main content region, discreet footer, mobile drawer, and notification dropdown. The existing dashboard now uses this shell while preserving its page content.

## Layout

Desktop content reserves space for an expanded or collapsed fixed sidebar. Mobile content uses the full viewport and opens navigation as a dismissible drawer. The global header is sticky; the main content owns its responsive padding and prevents page-level horizontal overflow.

Reusable page structures are exported from `src/components/layout`: dashboard, CRUD, detail, table, form, wizard, empty-page, content container, page header, and transition wrapper. These templates control width and spacing without owning feature behavior.

## Sidebar and navigation

`AppSidebar` accepts nested `AppNavigationItem` records and derives active state from the current pathname. It supports expanded, collapsed, and mobile modes, internal scrolling, badges, icons through the design-system wrapper, tooltips while collapsed, focus states, and active-route semantics.

Keep the navigation catalog outside the component. Add modules as data; do not duplicate sidebar markup or embed permission checks in presentation. Application services should filter authorized items before rendering.

## Header

`GlobalHeader` composes global search, breadcrumbs, notification access, company selection, language, theme, and user menu. Less critical controls collapse at narrower breakpoints while remaining available through menus in future integrations.

`CompanySwitcher`, `LanguageSwitcher`, and `ThemeSwitcher` are controlled visual components. They do not persist values or mutate session state. Consumers must connect them to application use cases later.

## Search

Global search is visual only and displays the planned Ctrl+K shortcut. It does not query a backend or activate a command palette in the integrated dashboard. A reusable palette primitive remains available for a future scoped sprint.

## Notification center and user menu

The notification center is a mobile-safe side panel with an empty state and unread indicators. The user menu reserves routes for profile, settings, current company, language, theme, help, and sign-out. Neither component implements authentication or notification delivery.

## Accessibility and performance

Interactive targets are at least 44px, focus remains visible, landmark labels and current-page state are exposed to assistive technology, overlays support Escape or backdrop dismissal, and motion respects `prefers-reduced-motion`. Heavy future search, map, and notification implementations should be dynamically imported at the route boundary. Memoize only when profiling demonstrates meaningful rerender cost.

## Adoption rules

1. Use `AppShell` once at the authenticated application boundary.
2. Supply tenant-filtered navigation and current-session view data.
3. Use the shared page layouts and `AppPageHeader` inside routes.
4. Keep feature state, authorization, and network calls outside shell components.
5. Validate mobile navigation, focus order, overlay dismissal, and visual regressions before replacing an existing layout.
