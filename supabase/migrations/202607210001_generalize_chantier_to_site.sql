-- Sprint: generalize the Chantier concept into a vertical-agnostic Site entity.
-- Product decision: STRATON now targets any service business (Cleaning, Electrical,
-- HVAC, Security, Logistics, Hospitality, Facility Management, etc.), not only
-- construction. "Chantier" (Belgian/French for construction site) is renamed to the
-- neutral "Site" everywhere. No data is lost — this is a pure rename plus one new
-- optional column. A construction company can still name individual rows "Chantier
-- Avenue Louise" etc.; only the table/column/object names change, not the free-text
-- content users enter.

alter table public.chantiers rename to sites;
alter table public.timesheet_entries rename column chantier_id to site_id;

-- Free-text reference code (common in Belgian business practice, e.g. an internal
-- or client reference number). Distinct from po_number, which is a formal purchase
-- order document number — a Site may have both, or either, independently.
alter table public.sites add column if not exists reference text;

alter table public.sites rename constraint chantiers_pkey to sites_pkey;
alter table public.sites rename constraint chantiers_company_id_fkey to sites_company_id_fkey;
alter table public.sites rename constraint chantiers_client_company_id_fkey to sites_client_company_id_fkey;
alter table public.sites rename constraint chantiers_manager_id_fkey to sites_manager_id_fkey;
alter table public.sites rename constraint chantiers_project_id_fkey to sites_project_id_fkey;
alter table public.timesheet_entries rename constraint timesheet_entries_chantier_id_fkey to timesheet_entries_site_id_fkey;

alter index public.chantiers_company_id_idx rename to sites_company_id_idx;

alter policy "chantiers_tenant_read" on public.sites rename to "sites_tenant_read";
alter policy "chantiers_tenant_insert" on public.sites rename to "sites_tenant_insert";
alter policy "chantiers_tenant_update" on public.sites rename to "sites_tenant_update";
