# STRATON --- WEATHER INTELLIGENCE

Version: 1.1 Status: First slice shipped (Sprint 6.7, 2026-07-22) Last Updated: 2026-07-22

Weather Intelligence is a decision-support module that resolves forecast locations from Site coordinates, retrieves forecasts for planned working days, and generates weather alerts. This first slice covers the live-forecast + alert path; the traceable-snapshot-history ambition below is not yet built.

## What's implemented

- **Provider**: Open-Meteo (free, keyless, no account required — chosen specifically to avoid tying the project to a paid API). Integration is provider-neutral: `src/infrastructure/weather/types.ts` defines a `WeatherProvider` interface (`fetchForecast(latitude, longitude, days)`), implemented by `src/infrastructure/weather/open-meteo.ts`. Swapping or adding a provider means implementing that interface, not touching callers.
- **Alerts**: `src/features/weather/alerts.ts` scores each forecast day into `none` / `watch` / `delay-risk` from precipitation probability and max wind speed — the two conditions most likely to block outdoor electrical/HVAC site work. Thresholds are a starting point, not a tuned model.
- **Read path**: `src/features/weather/data.ts` (`getSiteWeatherOverview`) loads the company's `sites` rows with `latitude`/`longitude` set and fetches a 7-day forecast per site.
- **UI**: `/dashboard/sites` (`app/[locale]/dashboard/sites/page.tsx` + `components/weather/SiteWeatherOverview.tsx`) — the first Sites page the app has ever had, read-only, listing each site's forecast and alert badges. The "Sites" nav item is no longer disabled.

## What's still open (from the original concept, not built)

- **No persistence** — forecasts are fetched live on every page load, not stored. There is no `weather_snapshots` table or equivalent.
- **No historical-observation distinction** — only forward-looking forecasts exist; nothing records what actually happened for comparison.
- **No provenance/confidence metadata retained** — the provider name and fetch time aren't persisted anywhere a user could audit later.
- **No audit logs or retention rules** — follows naturally from having no persistence yet.
- **No project-report integration** — weather impact doesn't feed into `projects`/`reports` yet; that was always meant to come after cost/margin analysis exists.
- **No automatic timesheet rewriting** — this was a non-goal from the start and remains one; weather estimates must never silently alter authoritative timesheets.

Company-scoped visibility already comes for free from the existing `sites` RLS policies (`sites_tenant_read`) — no new access-control work was needed for this slice.
