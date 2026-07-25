# STRATON --- COMPANY MANAGEMENT

Version: 1.3 Status: Completed (Sprint 3.8); VAT autofill via VIES Completed (Sprint 6.8) Last Updated: 2026-07-22

Company Management extends the existing `public.companies` tenant root. It does not introduce another company table, membership model, Company Switcher, or active-company context.

## Company and membership

Company stores public operational identity, localization, address, contact, status, and logo reference. Company Membership links one permanent Profile to one tenant. The membership’s normalized roles determine management capabilities while RLS independently enforces access.

The active company remains a server-validated session preference. Company Management reads a URL company only after confirming that the authenticated session contains a valid membership. Unknown and unauthorized identifiers share the same not-found response and do not disclose tenant data.

## Creation

`public.create_company` is a security-definer database function available only to authenticated users. In one transaction it:

1. normalizes and reserves a unique non-sensitive slug;
2. creates the Company with active status;
3. creates one active Company Membership for `auth.uid()`;
4. assigns the system owner role;
5. creates default Company Settings.

If any step fails, PostgreSQL rolls back the complete operation. The frontend never supplies an owner user ID or company ID.

## Editing and settings

Profile and settings mutations revalidate authentication and require owner/admin membership before reaching RLS-protected updates. Mutable fields are allow-listed and normalized. IDs, ownership, creation timestamps, security data, and tenant identifiers cannot be edited through forms. Slugs remain stable when display names change.

Owner and admin can edit profile and operational settings. Manager, supervisor, and viewer receive read-only access when their membership authorizes viewing. Employee and contractor do not receive administrative controls.

## Status and archival

Supported states are active, inactive, suspended, and archived. Operational status changes require owner/admin; archive/reactivate requires owner. Archival updates status only: no Company, Membership, Workforce, Team, Project, or historical row is deleted. Archived companies are removed from the Company Switcher but remain visible to their authorized owner in Company Management for reactivation.

## Integrations

- **Company Switcher:** uses authenticated memberships and excludes archived companies.
- **Workforce:** member and team summaries query existing Company Membership, Team, and Team Membership tables by trusted company context.
- **Projects:** overview counts existing active projects; no project workflow is reimplemented.
- **Logo:** a safe placeholder and `logo_url` field are prepared. Upload remains disabled until bucket-specific authorization and validation policies are implemented.

Future branches must model an explicit hierarchy or relationship instead of duplicating tenants. Billing, payroll, GPS, geofencing, weather, accounting, and fiscal validation remain isolated future modules and must not weaken this tenant boundary.

## VAT-based company autofill (VIES) — implemented

**Status: Completed, Sprint 6.8 (2026-07-22).** Registered 2026-07-21 after evaluating whether company creation could autofill from the Belgian BCE/KBO public register.

**Decision (unchanged from the original note):** do not scrape `kbopub.economie.fgov.be` — it is a human-facing page, not an API, with no stability guarantee and likely against its terms of use. Use **VIES** (VAT Information Exchange System, European Commission) instead: the standard, free, official route EU B2B SaaS products use to validate a VAT number and retrieve the registered name/address. It also generalizes to any EU country, not just Belgium, consistent with the multi-country vision already registered in `01-product/PRODUCT_VISION.md`. Confirmed live and browser-verified against the real BELNEX ENERGY VAT number (`BE1038194067`).

**What's built:**
1. `src/infrastructure/vies/client.ts` — server-only `lookupVat(countryCode, vatNumber)` calling the confirmed-live REST endpoint `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/{countryCode}/vat/{vatNumber}` (no SOAP, no auth, no rate-limit signup). Parses the multi-line `address` field into `addressLine1`/`postalCode`/`city`.
2. `lookupVatAction` (`src/features/companies/actions.ts`) — authenticated Server Action wrapping the client (call happens server-side, never from the browser).
3. `CompanyDetailsForm` — a "Look up VIES" button next to the VAT field prefills `legalName`, `city`, and (on the edit form, where those fields are visible) `addressLine1`/`postalCode`. The user still reviews and submits normally through the existing `create_company` RPC / `updateCompanyAction` — nothing is silently overwritten or auto-submitted.
4. Unreachable/invalid VIES responses degrade to manual entry with an inline error message, per the "not decided yet" question in the original note — resolved in favor of not blocking the form.

**Still separate, not built:** `registration_number` (BCE/KBO) is a distinct identifier from VAT and VIES does not return it — BCE-specific data (NACE activities, legal situation) would need the KBO Open Data bulk extract, a separate, larger integration not conflated with this VAT lookup.
