import type { Client } from "pg";
import { describe, expect, it } from "vitest";
import { actAs, assertRlsIsEnforced, attemptWrite, DEMO, withRollback } from "../helpers/db";
import { hashToken, mintInviteToken } from "@/src/features/partners/invite-token";

/**
 * Inviting a company that has no STRATON account (#20).
 *
 * A live token lets a stranger create a company linked to yours, so it is a
 * credential, and it is treated like one: hashed at rest, single-use, expiring,
 * and revealing nothing to anyone who does not hold it.
 */
const describeIfDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

/** A Nordclean employee with no connection to Belnex — stands in for the invitee. */
const OUTSIDER_USER_ID = "d0000002-0000-4000-8000-000000000205";

async function createInvite(
  db: Client,
  token: string,
  options: { expiresInDays?: number } = {},
): Promise<void> {
  await actAs(db, DEMO.belnex.adminUserId);
  await db.query(
    `insert into public.company_invites
       (token_digest, source_company_id, relationship_type, company_name, registration_number,
        city, invited_email, expires_at, created_by)
     values ($1, $2, 'subcontractor', 'TOITURE MARTIN SPRL', '0745123456', 'Namur',
             'martin@example.be', now() + make_interval(days => $3), $4)`,
    [hashToken(token), DEMO.belnex.companyId, options.expiresInDays ?? 21, DEMO.belnex.adminUserId],
  );
}

describeIfDb("the invitation token", () => {
  it("is hashed the same way in Node and in Postgres", async () => {
    // The one assertion neither side can make alone. If these ever disagree,
    // every invitation silently stops working and it looks like an expiry bug.
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      const { rows } = await db.query<{ digest: string }>(
        "select encode(sha256($1::text::bytea), 'hex') as digest",
        [token],
      );
      expect(rows[0].digest).toBe(hashToken(token));
    });
  });

  it("is never stored in the clear", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);

      await db.query("reset role");
      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.company_invites where token_digest = $1",
        [token],
      );
      expect(rows[0].count).toBe("0");
    });
  });
});

describeIfDb("who can see an invitation", () => {
  it("the company that sent it", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);
      await assertRlsIsEnforced(db);

      const { rows } = await db.query<{ count: string }>(
        "select count(*)::text as count from public.company_invites where source_company_id = $1",
        [DEMO.belnex.companyId],
      );
      expect(rows[0].count).toBe("1");
    });
  });

  it("not the invitee, and not anyone else", async () => {
    // Holding a token is not the same as being able to browse the table it
    // lives in. The two functions are the only way in.
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);

      await actAs(db, OUTSIDER_USER_ID);
      const { rows } = await db.query<{ count: string }>("select count(*)::text as count from public.company_invites");
      expect(rows[0].count).toBe("0");
    });
  });

  it("cannot be forged onto another company", async () => {
    await withRollback(async (db) => {
      await actAs(db, DEMO.nordclean.adminUserId);
      const forged = await attemptWrite(
        db,
        `insert into public.company_invites
           (token_digest, source_company_id, relationship_type, company_name, invited_email, expires_at)
         values ($1, $2, 'subcontractor', 'Forged', 'x@example.be', now() + interval '7 days')`,
        [hashToken("forged-token"), DEMO.belnex.companyId],
      );
      expect(forged).toBe(false);
    });
  });
});

describeIfDb("the preview a token buys", () => {
  it("names the inviter and the company, and nothing more", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);

      await actAs(db, OUTSIDER_USER_ID);
      const { rows } = await db.query<{ inviter_name: string; company_name: string }>(
        "select inviter_name, company_name from public.company_invite_preview($1)",
        [token],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].inviter_name).toContain("BELNEX");
      expect(rows[0].company_name).toBe("TOITURE MARTIN SPRL");
    });
  });

  const nothingCases = [
    ["a token that was never issued", "not-a-real-token"],
    ["an empty token", ""],
  ] as const;

  for (const [label, token] of nothingCases) {
    it(`returns nothing for ${label}`, async () => {
      await withRollback(async (db) => {
        await createInvite(db, mintInviteToken().token);
        await actAs(db, OUTSIDER_USER_ID);
        const { rows } = await db.query("select * from public.company_invite_preview($1)", [token]);
        expect(rows).toHaveLength(0);
      });
    });
  }

  it("returns nothing once the invitation has expired", async () => {
    // Indistinguishable from a wrong token, deliberately: otherwise the two
    // answers together tell you which tokens once existed.
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token, { expiresInDays: -1 });

      await actAs(db, OUTSIDER_USER_ID);
      const { rows } = await db.query("select * from public.company_invite_preview($1)", [token]);
      expect(rows).toHaveLength(0);
    });
  });
});

describeIfDb("accepting", () => {
  async function accept(db: Client, token: string) {
    return db.query<{ accept_company_invite: string }>(
      "select public.accept_company_invite($1, 'TOITURE MARTIN SPRL') as accept_company_invite",
      [token],
    );
  }

  it("creates the company, its first owner, and the link back", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);

      await actAs(db, OUTSIDER_USER_ID);
      const { rows } = await accept(db, token);
      const newCompanyId = rows[0].accept_company_invite;
      expect(newCompanyId).toBeTruthy();

      await db.query("reset role");

      const owner = await db.query<{ count: string }>(
        `select count(*)::text as count
         from public.company_memberships cm
         join public.membership_roles mr on mr.membership_id = cm.id
         join public.roles r on r.id = mr.role_id
         where cm.company_id = $1 and cm.user_id = $2 and cm.status = 'active' and r.key = 'owner'`,
        [newCompanyId, OUTSIDER_USER_ID],
      );
      expect(owner.rows[0].count).toBe("1");

      const link = await db.query<{ count: string }>(
        `select count(*)::text as count from public.company_relationships
         where source_company_id = $1 and target_company_id = $2
           and status = 'active' and relationship_type = 'subcontractor'`,
        [DEMO.belnex.companyId, newCompanyId],
      );
      expect(link.rows[0].count).toBe("1");
    });
  });

  it("cannot be done twice with the same token", async () => {
    // Two clicks on one emailed link must not become two companies.
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);

      await actAs(db, OUTSIDER_USER_ID);
      await accept(db, token);

      const second = await attemptWrite(db, "select public.accept_company_invite($1)", [token]);
      expect(second).toBe(false);
    });
  });

  it("is refused for an expired invitation", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token, { expiresInDays: -1 });

      await actAs(db, OUTSIDER_USER_ID);
      expect(await attemptWrite(db, "select public.accept_company_invite($1)", [token])).toBe(false);
    });
  });

  it("is refused for a revoked invitation", async () => {
    await withRollback(async (db) => {
      const { token } = mintInviteToken();
      await createInvite(db, token);
      await db.query("update public.company_invites set status = 'revoked' where token_digest = $1", [
        hashToken(token),
      ]);

      await actAs(db, OUTSIDER_USER_ID);
      expect(await attemptWrite(db, "select public.accept_company_invite($1)", [token])).toBe(false);
    });
  });

  it("is refused for a token nobody issued", async () => {
    await withRollback(async (db) => {
      await actAs(db, OUTSIDER_USER_ID);
      expect(await attemptWrite(db, "select public.accept_company_invite($1)", ["invented"])).toBe(false);
    });
  });
});
