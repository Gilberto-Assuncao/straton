import "server-only";

import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { log } from "@/src/infrastructure/observability/logger";
import { notify, type NotificationKey, type NotificationParams } from "@/src/features/notifications/publish";

/**
 * Tells the people who follow a work location that it changed (#83).
 *
 * The audience is resolved **now**, at the moment of the event, and not when
 * somebody opens the list. That is the issue's own requirement and it is not a
 * detail: computing it on read would mean recalculating "who was involved"
 * against today's list, so somebody taken off the chantier last week would keep
 * seeing what happened after they left, and somebody added yesterday would see
 * what happened before they arrived.
 *
 * The admin client, because the resolver crosses companies by design — the
 * publisher needs the whole list, while the screen still shows each company
 * only its own part. The authority for writing lives in the action that already
 * made the change: nothing calls this without having been allowed to do the
 * thing it announces.
 */
export async function notifySiteAudience({
  siteId,
  siteAreaId = null,
  actorId,
  key,
  params,
}: {
  siteId: string;
  /** Null for a change to the location itself, which sector lists skip. */
  siteAreaId?: string | null;
  /** Left out of the audience: nobody needs telling what they just did. */
  actorId: string;
  key: NotificationKey;
  params: NotificationParams;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("site_notification_audience", {
      p_site_id: siteId,
      p_site_area_id: siteAreaId,
    });

    if (error) {
      log.error({ event: "site_audience_resolve_failed", source: "notifySiteAudience", code: error.code }, error);
      return;
    }

    const targets = ((data ?? []) as { user_id: string; company_id: string }[])
      // The first reason people turn notifications off is being told about
      // their own edits. Filtered here rather than in SQL because "who did it"
      // is a fact about this request, not about the location.
      .filter((row) => row.user_id !== actorId)
      .map((row) => ({ userId: row.user_id, companyId: row.company_id }));

    await notify(targets, key, params, `/dashboard/sites/${siteId}`);
  } catch (error) {
    // Never throws, for the same reason `notify` does not: losing the change
    // because the announcement failed would be the worse outcome of the two.
    log.error({ event: "site_audience_resolve_failed", source: "notifySiteAudience" }, error);
  }
}
