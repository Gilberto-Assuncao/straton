export const AVAILABILITY_KINDS = ["unavailable", "available"] as const;
export type AvailabilityKind = (typeof AVAILABILITY_KINDS)[number];

export const AVAILABILITY_REASONS = ["holiday", "sick", "training", "personal", "other"] as const;
export type AvailabilityReason = (typeof AVAILABILITY_REASONS)[number];

export interface AvailabilityRecord {
  id: string;
  membershipId: string;
  personName: string;
  startsAt: string;
  endsAt: string;
  kind: AvailabilityKind;
  reason: AvailabilityReason | null;
  /**
   * Null for everyone but the person themselves and their managers. The date
   * range is what scheduling needs; *why* someone is away is nobody else's
   * business, and "sick" plus a note is health data.
   */
  note: string | null;
  /** Whether the viewer may edit or delete this record. */
  canManage: boolean;
}

export interface AvailabilityConflict {
  membershipId: string;
  startsAt: string;
  endsAt: string;
  reason: AvailabilityReason | null;
}
