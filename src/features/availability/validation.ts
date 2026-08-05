import { AVAILABILITY_KINDS, AVAILABILITY_REASONS } from "./types";
import type { AvailabilityKind, AvailabilityReason } from "./types";

export type AvailabilityErrorKey =
  | "missingPerson"
  | "missingDates"
  | "endBeforeStart"
  | "invalidKind"
  | "invalidReason"
  | "reasonRequired"
  | "tooLong";

export interface ParsedAvailability {
  membershipId: string;
  startsAt: string;
  endsAt: string;
  kind: AvailabilityKind;
  reason: AvailabilityReason | null;
  note: string | null;
}

/**
 * A year. Not a business rule so much as a guard against a typo in a year field
 * quietly blocking someone out of every schedule until 2124.
 */
const MAX_DAYS = 366;

/**
 * Parses and checks a declaration before it reaches the database.
 *
 * The overlap and the ends-after-starts rules are enforced by constraints too —
 * this is not a substitute for those. It exists so the person gets a sentence
 * they can act on instead of a constraint name, and it returns keys rather than
 * English so the message is translated at the edge like every other one.
 */
export function parseAvailability(formData: FormData): ParsedAvailability | { error: AvailabilityErrorKey } {
  const text = (key: string) => String(formData.get(key) ?? "").trim();

  const membershipId = text("membershipId");
  if (!membershipId) return { error: "missingPerson" };

  const startsAt = text("startsAt");
  const endsAt = text("endsAt");
  if (!startsAt || !endsAt) return { error: "missingDates" };

  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { error: "missingDates" };
  if (end <= start) return { error: "endBeforeStart" };
  if ((end.getTime() - start.getTime()) / 86_400_000 > MAX_DAYS) return { error: "tooLong" };

  const kind = text("kind") || "unavailable";
  if (!AVAILABILITY_KINDS.includes(kind as AvailabilityKind)) return { error: "invalidKind" };

  const rawReason = text("reason");
  if (rawReason && !AVAILABILITY_REASONS.includes(rawReason as AvailabilityReason)) {
    return { error: "invalidReason" };
  }
  // An absence without a reason cannot be told apart from a data-entry slip,
  // and the schedule needs to know whether it is negotiable. A declared
  // *availability* needs no justification.
  if (kind === "unavailable" && !rawReason) return { error: "reasonRequired" };

  return {
    membershipId,
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
    kind: kind as AvailabilityKind,
    reason: rawReason ? (rawReason as AvailabilityReason) : null,
    note: text("note") || null,
  };
}
