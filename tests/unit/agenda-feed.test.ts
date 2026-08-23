import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hashFeedToken, mintFeedToken, agendaFeedUrl } from "@/src/features/assignments/feed-token";

/**
 * What the calendar feed is not allowed to carry, and who is not allowed to ask
 * for it (#49, passo 2).
 *
 * These are the rules from the issue that no type check can hold: the URL is a
 * credential, the feed carries no instructions and no notes, and the function
 * that turns a token into somebody's movements has exactly one caller. Each is
 * a property of the SQL and the route rather than of any value they compute, so
 * each is read out of the source.
 *
 * `tests/rls/agenda-feed.test.ts` checks the same rules the other way round, by
 * running them against Postgres. This file is what runs on every push.
 */
const MIGRATION = "supabase/migrations/202608220001_agenda_feed.sql";
const ROUTE = "app/api/agenda/[token]/route.ts";

const sql = readFileSync(MIGRATION, "utf8");
const route = readFileSync(ROUTE, "utf8");

/** Source with its prose removed — a rule quoted in a comment is not the rule. */
function code(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, "").replace(/\/\/.*$/gm, "");
}

describe("the subscription token", () => {
  it("is 32 random bytes, and different every time", () => {
    const first = mintFeedToken();
    const second = mintFeedToken();
    expect(first.token).not.toBe(second.token);
    // base64url of 32 bytes: 43 characters, no padding, nothing a URL or a
    // messaging app will rewrite on the way to a phone.
    expect(first.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("is stored only as a digest", () => {
    const { token, digest } = mintFeedToken();
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(token);
    expect(hashFeedToken(token)).toBe(digest);
  });

  it("agrees with a digest computed outside this codebase", () => {
    // `printf 'straton' | sha256sum`, not a value read back out of the function
    // under test — which would only prove it agrees with itself. Postgres
    // computes the other half of this comparison as
    // `encode(sha256(token::bytea), 'hex')`, and the two must never drift: if
    // they do, every stored digest becomes unmatchable and every subscription
    // 404s, with nothing in any log to say why.
    expect(hashFeedToken("straton")).toBe(
      "fb4b0238135cc306f0087c42033f589a546beac6763a228b53da7c706adcd182",
    );
  });

  it("builds a URL a calendar client will accept", () => {
    const url = agendaFeedUrl("https://straton.be/", "abc-123");
    expect(url).toBe("https://straton.be/api/agenda/abc-123.ics");
  });
});

describe("what the feed is allowed to carry", () => {
  it("reads the migration it claims to be checking", () => {
    // Without this, a renamed migration would make every assertion below pass
    // against an empty string.
    expect(sql.length).toBeGreaterThan(1000);
    expect(sql).toContain("create or replace function public.agenda_feed_events");
  });

  it("never selects the instructions or the notes", () => {
    // The rule from the issue. Instructions are written for people inside the
    // platform and can carry a client's door code or a remark about a
    // colleague; once they are in a Google calendar they are outside our
    // control, and whoever typed them never agreed to that.
    const body = code(sql);
    expect(body).not.toMatch(/\ba\.instructions\b/);
    expect(body).not.toMatch(/\binstructions\b/);
  });

  it("hands the token to nobody but the app's own route", () => {
    // Granted to service_role alone. An anon grant would put a token-guessing
    // endpoint on the public API, which is the one thing a digest cannot
    // protect against on its own.
    const body = code(sql);
    expect(body).toContain("grant execute on function public.agenda_feed_events(text, timestamptz, timestamptz) to service_role");
    expect(body).toMatch(/revoke all on function public\.agenda_feed_events\([^)]*\) from anon/);
    expect(body).toMatch(/revoke all on function public\.agenda_feed_events\([^)]*\) from authenticated/);
    expect(body).not.toMatch(/grant execute on function public\.agenda_feed_events\([^)]*\) to anon/);
  });

  it("keeps the table behind row-level security", () => {
    expect(code(sql)).toContain("alter table public.agenda_feeds enable row level security");
    // Policies and grants are independent; having one is not having the other.
    expect(code(sql)).toContain("grant select, insert, update on public.agenda_feeds to authenticated");
  });

  it("never lets a feed row be deleted", () => {
    // Revoking is an update. A delete would drop the digest, and the fact that
    // a URL once existed is exactly what somebody investigating a leak needs.
    expect(code(sql)).not.toMatch(/grant[^;]*delete[^;]*on public\.agenda_feeds/);
    expect(code(sql)).not.toMatch(/for delete[\s\S]{0,80}agenda_feeds/);
  });
});

describe("the route", () => {
  it("reads the route it claims to be checking", () => {
    expect(route).toContain("agenda_feed_events");
  });

  it("never writes the token anywhere it could be read back", () => {
    // A 404 body echoing the token would put a live credential into every proxy
    // log between here and the phone, and a log line would do the same to ours.
    const body = code(route);
    const logCalls = body.match(/log\.\w+\([^)]*\)/g) ?? [];
    expect(logCalls.length, "log calls found in the route").toBeGreaterThan(0);
    for (const call of logCalls) expect(call).not.toContain("token");
    expect(body).not.toMatch(/NextResponse\([^)]*token/);
  });

  it("never returns a provider error to the caller", () => {
    // The rule from #27, and here it bites harder than usual: a Postgres error
    // quotes the offending value back, and the offending value is the token.
    expect(code(route)).not.toMatch(/error\.message/);
  });

  it("keeps the calendar out of every shared cache", () => {
    expect(code(route)).toContain("private, no-store");
  });
});
