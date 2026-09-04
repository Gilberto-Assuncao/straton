import { describe, expect, it } from "vitest";
import {
  refuseSupportSession,
  SUPPORT_SESSION_MINUTES,
  supportSessionExpiry,
  type SupportSessionRow,
} from "@/src/features/support/session";

/**
 * When a support session may be used (#19).
 *
 * This is the check that decides whether one company's data is shown to
 * somebody who is not in it, and every read in `src/features/support/data.ts`
 * runs through the service role — which bypasses RLS. So there is no policy
 * underneath to catch a mistake here: this function *is* the boundary.
 *
 * Tested against an injected clock rather than the wall clock. A test that
 * builds an expiry from `Date.now()` and then reads `Date.now()` again passes
 * while proving only that time moves forwards.
 */
const ADMIN = "a0000000-0000-4000-8000-000000000001";
const COMPANY = "c0000000-0000-4000-8000-000000000001";
const OTHER_COMPANY = "c0000000-0000-4000-8000-000000000002";
const NOW = new Date("2026-08-30T10:00:00.000Z");

function session(overrides: Partial<SupportSessionRow> = {}): SupportSessionRow {
  return {
    id: "s0000000-0000-4000-8000-000000000001",
    admin_user_id: ADMIN,
    company_id: COMPANY,
    started_at: "2026-08-30T09:45:00.000Z",
    expires_at: "2026-08-30T10:15:00.000Z",
    ended_at: null,
    ...overrides,
  };
}

describe("supportSessionExpiry", () => {
  it("ends the session SUPPORT_SESSION_MINUTES after it started", () => {
    const startedAt = new Date("2026-08-30T09:45:00.000Z");
    const expiry = new Date(supportSessionExpiry(startedAt));
    expect((expiry.getTime() - startedAt.getTime()) / 60_000).toBe(SUPPORT_SESSION_MINUTES);
  });

  it("is long enough for a phone call and short enough not to be a second set of keys", () => {
    // The number is a decision, not an implementation detail, so it is asserted
    // rather than read from the module: a silent change from 30 to 480 would
    // otherwise pass every test in this file.
    expect(SUPPORT_SESSION_MINUTES).toBe(30);
  });

  it("produces a value the database's own check constraint would accept", () => {
    // `support_sessions_expiry_after_start` is `expires_at > started_at`. A
    // zero or negative window would be refused by Postgres at insert time, and
    // the failure would surface as a generic action error rather than here.
    const startedAt = new Date("2026-08-30T09:45:00.000Z");
    expect(new Date(supportSessionExpiry(startedAt)).getTime()).toBeGreaterThan(startedAt.getTime());
  });
});

describe("refuseSupportSession", () => {
  it("allows an open session for the company being viewed", () => {
    expect(refuseSupportSession(session(), COMPANY, NOW)).toBeNull();
  });

  it("refuses a session that was closed", () => {
    expect(
      refuseSupportSession(session({ ended_at: "2026-08-30T09:50:00.000Z" }), COMPANY, NOW),
    ).toBe("ended");
  });

  it("refuses a session that ran out", () => {
    expect(
      refuseSupportSession(session({ expires_at: "2026-08-30T09:59:59.000Z" }), COMPANY, NOW),
    ).toBe("expired");
  });

  it("refuses a session whose expiry is exactly now", () => {
    // The boundary is the point. `<` instead of `<=` leaves a session usable at
    // the instant it expires, which no manual test would ever land on.
    expect(
      refuseSupportSession(session({ expires_at: NOW.toISOString() }), COMPANY, NOW),
    ).toBe("expired");
  });

  it("refuses a valid session presented for a different company", () => {
    // The address-bar case: a real, open, unexpired session for company A and
    // `/dashboard/support/B` typed in by hand. Nothing in the URL is trusted.
    expect(refuseSupportSession(session(), OTHER_COMPANY, NOW)).toBe("otherCompany");
  });

  it("reports the session closed rather than the wrong company when it is both", () => {
    // Order matters for what gets logged: `otherCompany` is the line that wakes
    // somebody up, so it must not be raised by an ordinary session that was
    // simply closed while a second tab was open on another company.
    expect(
      refuseSupportSession(
        session({ ended_at: "2026-08-30T09:50:00.000Z" }),
        OTHER_COMPANY,
        NOW,
      ),
    ).toBe("ended");
  });

  it("refuses a session issued for a company after it expired, whichever is checked first", () => {
    // Both wrong, neither ok. This asserts the function cannot return null on a
    // combination — the failure a sequence of early returns can produce if one
    // of them is ever reordered into an `else`.
    expect(
      refuseSupportSession(
        session({ expires_at: "2026-08-30T09:00:00.000Z" }),
        OTHER_COMPANY,
        NOW,
      ),
    ).not.toBeNull();
  });
});
