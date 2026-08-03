// Shared between server data access and client forms, so it must stay free of
// `server-only` imports — SITE_STATUSES is a runtime value the form renders.
export type SiteAddress = { street?: string; city?: string; postal_code?: string; country?: string };

export type SiteRecord = {
  id: string;
  name: string;
  reference: string | null;
  status: string;
  address: SiteAddress;
  latitude: number | null;
  longitude: number | null;
  poNumber: string | null;
  costCenter: string | null;
  projectId: string | null;
  projectName: string | null;
  clientCompanyId: string | null;
  clientName: string | null;
  startsAt: string | null;
  endsAt: string | null;
};

export const SITE_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export type ClientOption = { id: string; name: string; city: string | null };
