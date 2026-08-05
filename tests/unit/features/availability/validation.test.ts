import { describe, expect, it } from "vitest";
import { parseAvailability } from "@/src/features/availability/validation";

function form(fields: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

const valid = {
  membershipId: "d0000003-0000-4000-8000-000000000104",
  startsAt: "2026-09-01",
  endsAt: "2026-09-15",
  kind: "unavailable",
  reason: "holiday",
};

describe("declaring an absence", () => {
  it("accepts a well-formed holiday", () => {
    const result = parseAvailability(form(valid));
    expect("error" in result).toBe(false);
    if ("error" in result) return;
    expect(result.reason).toBe("holiday");
    expect(new Date(result.endsAt) > new Date(result.startsAt)).toBe(true);
  });

  it("rejects an end before the start", () => {
    const result = parseAvailability(form({ ...valid, startsAt: "2026-09-15", endsAt: "2026-09-01" }));
    expect(result).toEqual({ error: "endBeforeStart" });
  });

  it("rejects a zero-length range", () => {
    // Not an absence at all, and it would slip past a naive `<` comparison.
    const result = parseAvailability(form({ ...valid, startsAt: "2026-09-01", endsAt: "2026-09-01" }));
    expect(result).toEqual({ error: "endBeforeStart" });
  });

  it("rejects a range longer than a year", () => {
    // Guards the typo that blocks someone out of every schedule until 2124.
    const result = parseAvailability(form({ ...valid, startsAt: "2026-09-01", endsAt: "2126-09-01" }));
    expect(result).toEqual({ error: "tooLong" });
  });

  it("requires a reason for an absence", () => {
    // Without one, a real absence cannot be told from a data-entry slip, and
    // the schedule has no way to know whether it is negotiable.
    const result = parseAvailability(form({ ...valid, reason: "" }));
    expect(result).toEqual({ error: "reasonRequired" });
  });

  it("does not require a reason for declared availability", () => {
    const result = parseAvailability(form({ ...valid, kind: "available", reason: "" }));
    expect("error" in result).toBe(false);
  });

  it("rejects a reason outside the allowed set", () => {
    const result = parseAvailability(form({ ...valid, reason: "fired" }));
    expect(result).toEqual({ error: "invalidReason" });
  });

  it("rejects a kind outside the allowed set", () => {
    const result = parseAvailability(form({ ...valid, kind: "maybe" }));
    expect(result).toEqual({ error: "invalidKind" });
  });

  it("rejects an unparseable date rather than passing NaN on", () => {
    const result = parseAvailability(form({ ...valid, startsAt: "not a date" }));
    expect(result).toEqual({ error: "missingDates" });
  });

  it("requires a person", () => {
    const result = parseAvailability(form({ ...valid, membershipId: "" }));
    expect(result).toEqual({ error: "missingPerson" });
  });

  it("returns keys, never sentences", () => {
    // The whole point of the union: the message is translated at the edge, so
    // an English string leaking out of here would be untranslatable.
    const result = parseAvailability(form({ ...valid, endsAt: "2026-08-01" }));
    expect("error" in result && result.error).toMatch(/^[a-zA-Z]+$/);
  });
});
