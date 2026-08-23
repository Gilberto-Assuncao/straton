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
  clientId: string | null;
  clientName: string | null;
  /** Null when the site has no client, which is allowed. */
  clientKind: ClientKind | null;
  startsAt: string | null;
  endsAt: string | null;
  // What used to live on the project and now lives here (#77, migration
  // 202608100002). Until this screen carried them the columns existed and
  // nothing could read or write them, so the numbers the migration moved were
  // reachable only from psql.
  description: string | null;
  priority: SitePriority;
  estimatedHours: number | null;
  budgetAmount: number | null;
  budgetSpent: number;
  budgetCurrency: string;
};

export const SITE_STATUSES = ["active", "paused", "completed", "archived"] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

// Mirrors the `public.project_priority` enum, which the location now shares.
export const SITE_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type SitePriority = (typeof SITE_PRIORITIES)[number];

/** A client is a person or a registered company (#85). */
export type ClientKind = "individual" | "company";

export type ClientOption = { id: string; name: string; kind: ClientKind; city: string | null };

/**
 * A subdivision inside a work location — "1er étage", "Elétrica da Sala".
 *
 * `isDefault` marks the one created with the location. The name cannot carry
 * that meaning: the product speaks ten languages, and the row the trigger
 * writes is named after the location itself, which is not a label anybody
 * chose. So the screen prints a translated "Whole location" for it — and the
 * moment somebody renames it the flag clears, because from then on the name is
 * theirs and translating over it would be overwriting their answer.
 */
export type SiteAreaRecord = {
  id: string;
  siteId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
};
