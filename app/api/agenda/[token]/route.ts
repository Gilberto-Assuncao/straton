import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { buildCalendar, type FeedEvent, type FeedEventStatus } from "@/src/features/assignments/ics";
import { log } from "@/src/infrastructure/observability/logger";

/**
 * The calendar a worker's phone subscribes to (#49, passo 2).
 *
 * No session: a calendar client cannot log in, so the token in the path is the
 * whole credential. It is never logged and never echoed back — a 404 body that
 * repeated it would put it in every proxy log between here and the phone.
 *
 * The service-role client is deliberate. `agenda_feed_events` is a security
 * definer function granted to `service_role` alone, so this route is its only
 * caller and there is no public endpoint to grind tokens against.
 */
export const dynamic = "force-dynamic";

/**
 * How much of the year travels.
 *
 * Back far enough that last month's work is still there to check against a
 * payslip, forward far enough to cover the planning horizon anyone actually
 * fills in. Unbounded would mean re-sending years of history on every refresh,
 * hourly, per worker.
 */
const PAST_DAYS = 30;
const FUTURE_DAYS = 120;
const DAY_MS = 86_400_000;

interface FeedRow {
  assignment_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: FeedEventStatus;
  site_name: string | null;
  site_address: { street?: string; city?: string; postal_code?: string; country?: string } | null;
  updated_at: string;
}

interface FeedPayload {
  worker_name: string | null;
  events: FeedRow[];
}

/**
 * Where to go, as one line.
 *
 * Same parts and the same order as the site list in the app — street, postal
 * code, city — so a worker comparing the two is reading the same address. The
 * site's own name leads, because "Chantier Wemmel" is what the supervisor says
 * on the phone and the street is what the van's navigation needs.
 */
function locationOf(row: FeedRow): string | null {
  const address = row.site_address ?? {};
  const parts = [row.site_name, address.street, address.postal_code, address.city].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  // The `.ics` suffix is part of the URL, not part of the token — several
  // clients decide how to treat a subscription by its extension before they
  // look at the Content-Type.
  const { token: segment } = await params;
  const token = segment.replace(/\.ics$/i, "");
  if (!token) return new NextResponse("Not found", { status: 404 });

  const now = new Date();
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("agenda_feed_events", {
    p_token: token,
    p_from: new Date(now.getTime() - PAST_DAYS * DAY_MS).toISOString(),
    p_until: new Date(now.getTime() + FUTURE_DAYS * DAY_MS).toISOString(),
  });

  if (error) {
    // The code, never the message: a Postgres error quotes the offending value
    // back, and here that value is the token.
    log.error({ event: "agenda_feed_failed", code: error.code });
    return new NextResponse("Unavailable", { status: 503 });
  }

  // Null is the answer for a token that is wrong or revoked, and an empty
  // `events` array is the answer for a worker with nothing booked. Collapsing
  // the two would make an empty week look like a broken subscription.
  const payload = data as FeedPayload | null;
  if (!payload) return new NextResponse("Not found", { status: 404 });

  const events: FeedEvent[] = payload.events.map((row) => ({
    id: row.assignment_id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    location: locationOf(row),
    updatedAt: row.updated_at,
  }));

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const body = buildCalendar(events, {
    name: payload.worker_name ? `STRATON — ${payload.worker_name}` : "STRATON",
    now,
    domain: new URL(appUrl).host,
  });

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="straton.ics"',
      // Never a shared cache. The URL is a credential, and a CDN that held this
      // would be holding one worker's movements under a key anyone with the
      // link can present.
      "Cache-Control": "private, no-store",
    },
  });
}
