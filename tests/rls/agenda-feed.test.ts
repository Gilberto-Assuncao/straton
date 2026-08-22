import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";
import { hashFeedToken, mintFeedToken } from "@/src/features/assignments/feed-token";

/**
 * Subscribing to your own agenda from a phone calendar (#49, passo 2).
 *
 * The URL is the whole credential — a calendar client cannot log in — so the
 * questions here are the ones a digest alone cannot answer: who can create a
 * feed, who can read that one exists, and what a token actually returns.
 *
 * The rule the app cannot check for itself is the middle one. A supervisor can
 * already see the whole company's week inside STRATON; what they must not have
 * is a standing, login-free URL to a colleague's movements. That is a policy
 * decision, and a policy is only true in the database.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** João Ferreira, field worker at Belnex. */
const WORKER = DEMO.belnex.fieldUserId;
/** Aline Dubois, owner/admin of the same company. */
const ADMIN = DEMO.belnex.adminUserId;

async function membershipOf(db: Client, userId: string): Promise<string> {
  await db.query("reset role");
  const { rows } = await db.query<{ id: string }>(
    "select id from public.company_memberships where user_id = $1 and company_id = $2",
    [userId, DEMO.belnex.companyId],
  );
  if (!rows[0]) throw new Error(`no Belnex membership for ${userId}`);
  return rows[0].id;
}

async function createFeed(db: Client, membershipId: string, token: string): Promise<string> {
  await db.query("reset role");
  const { rows } = await db.query<{ id: string }>(
    `insert into public.agenda_feeds (company_id, company_membership_id, token_digest)
     values ($1, $2, $3) returning id`,
    [DEMO.belnex.companyId, membershipId, hashFeedToken(token)],
  );
  return rows[0].id;
}

interface FeedPayload {
  worker_name: string;
  events: { assignment_id: string; title: string; starts_at: string }[];
}

async function readFeed(db: Client, token: string): Promise<FeedPayload | null> {
  await db.query("reset role");
  const { rows } = await db.query<{ payload: FeedPayload | null }>(
    "select public.agenda_feed_events($1, now() - interval '30 days', now() + interval '120 days') as payload",
    [token],
  );
  return rows[0].payload;
}

describeIfDb("the subscription token", () => {
  it("is hashed the same way in Node and in Postgres", async () => {
    // Neither side can make this assertion alone. If the two ever drift, every
    // subscription 404s at once and it looks like a routing bug.
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      const { rows } = await db.query<{ digest: string }>(
        "select encode(sha256($1::text::bytea), 'hex') as digest",
        [token],
      );
      expect(rows[0].digest).toBe(hashFeedToken(token));
    });
  });

  it("is never stored in the clear", async () => {
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      await createFeed(db, await membershipOf(db, WORKER), token);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.agenda_feeds where token_digest = $1",
        [token],
      );
      expect(rows[0].count).toBe("0");
    });
  });
});

describeIfDb("who can see that a feed exists", () => {
  it("the worker it belongs to", async () => {
    await withRollback(async (db) => {
      const membership = await membershipOf(db, WORKER);
      await createFeed(db, membership, mintFeedToken().token);

      await actAs(db, WORKER);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.agenda_feeds where company_membership_id = $1",
        [membership],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("not their own supervisor", async () => {
    // The decision this table exists to encode. An admin who can list a
    // colleague's feed is one query away from knowing whether that colleague
    // has a live URL — and a manager's legitimate view of the company agenda is
    // inside the app, where it is bounded by a session.
    await withRollback(async (db) => {
      const membership = await membershipOf(db, WORKER);
      await createFeed(db, membership, mintFeedToken().token);

      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.agenda_feeds where company_membership_id = $1",
        [membership],
      );
      expect(rows[0].count).toBe("0");
    });
  });

  it("nobody may publish somebody else's agenda", async () => {
    await withRollback(async (db) => {
      const victim = await membershipOf(db, WORKER);
      await actAs(db, ADMIN);
      await assertRlsIsEnforced(db);

      const wrote = await attemptWrite(
        db,
        `insert into public.agenda_feeds (company_id, company_membership_id, token_digest)
         values ($1, $2, $3)`,
        [DEMO.belnex.companyId, victim, hashFeedToken(mintFeedToken().token)],
      );

      // Both outcomes are checked. A refused INSERT raises; a policy that
      // accepted the statement and filtered it to nothing would return true
      // here and leave no row — the silence this repo has found on four tables.
      expect(wrote).toBe(false);
      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.agenda_feeds where company_membership_id = $1",
        [victim],
      );
      expect(rows[0].count).toBe("0");
    });
  });
});

describeIfDb("what a token returns", () => {
  it("that worker's own week, and nothing else", async () => {
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      await createFeed(db, await membershipOf(db, WORKER), token);

      const payload = await readFeed(db, token);
      expect(payload).not.toBeNull();
      // The seed gives this worker assignments; a feed that came back empty
      // would make every "does not contain" assertion below meaningless.
      expect(payload!.events.length, "assignments in the demo week").toBeGreaterThan(0);

      const { rows } = await db.query<{ id: string }>(
        `select a.id from public.assignments a
         join public.assignment_assignees aa on aa.assignment_id = a.id
         where aa.company_membership_id = $1`,
        [await membershipOf(db, WORKER)],
      );
      const mine = new Set(rows.map((row) => row.id));
      for (const event of payload!.events) expect(mine.has(event.assignment_id)).toBe(true);
    });
  });

  it("never the instructions", async () => {
    // The privacy rule from the issue, checked on what the function actually
    // returns rather than on what it was written to select.
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      const membership = await membershipOf(db, WORKER);
      await createFeed(db, membership, token);
      await db.query(
        `update public.assignments a set instructions = 'Code du portail: 4471'
         from public.assignment_assignees aa
         where aa.assignment_id = a.id and aa.company_membership_id = $1`,
        [membership],
      );

      const payload = await readFeed(db, token);
      expect(JSON.stringify(payload)).not.toContain("4471");
      expect(JSON.stringify(payload)).not.toContain("instructions");
    });
  });

  it("nothing at all for a token that was never issued", async () => {
    await withRollback(async (db) => {
      expect(await readFeed(db, mintFeedToken().token)).toBeNull();
    });
  });

  it("nothing at all once it is revoked", async () => {
    // Revoked and never-issued must be indistinguishable from outside, so a
    // guessed token tells an attacker nothing about whether it once existed.
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      const id = await createFeed(db, await membershipOf(db, WORKER), token);
      expect(await readFeed(db, token)).not.toBeNull();

      await db.query("update public.agenda_feeds set revoked_at = now() where id = $1", [id]);
      expect(await readFeed(db, token)).toBeNull();
    });
  });

  it("records that it was read", async () => {
    // The only thing that makes a leaked URL visible to the person it belongs
    // to: a read they did not make, at a time they can see.
    await withRollback(async (db) => {
      const { token } = mintFeedToken();
      const id = await createFeed(db, await membershipOf(db, WORKER), token);

      const before = await db.query<{ at: string | null }>(
        "select last_fetched_at as at from public.agenda_feeds where id = $1",
        [id],
      );
      expect(before.rows[0].at).toBeNull();

      await readFeed(db, token);
      const after = await db.query<{ at: string | null }>(
        "select last_fetched_at as at from public.agenda_feeds where id = $1",
        [id],
      );
      expect(after.rows[0].at).not.toBeNull();
    });
  });
});

describeIfDb("who may call the function", () => {
  it("the app's own route, and no browser", async () => {
    // A definer function granted to `anon` is a public endpoint for grinding
    // tokens, which no amount of hashing at rest protects against. Read from
    // the catalogue rather than from the migration text, because a later
    // migration could grant it back and the file this was written in would
    // still say the right thing.
    await withRollback(async (db) => {
      await db.query("reset role");
      const signature = "public.agenda_feed_events(text, timestamptz, timestamptz)";
      const { rows } = await db.query<{ anon: boolean; authenticated: boolean; service: boolean }>(
        `select has_function_privilege('anon', $1, 'EXECUTE') as anon,
                has_function_privilege('authenticated', $1, 'EXECUTE') as authenticated,
                has_function_privilege('service_role', $1, 'EXECUTE') as service`,
        [signature],
      );
      expect(rows[0].service, "the route must be able to call it").toBe(true);
      expect(rows[0].anon, "anon must not").toBe(false);
      expect(rows[0].authenticated, "authenticated must not").toBe(false);
    });
  });
});
