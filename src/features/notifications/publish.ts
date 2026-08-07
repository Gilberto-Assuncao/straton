import "server-only";

import { createAdminClient } from "@/src/infrastructure/supabase/admin";
import { log } from "@/src/infrastructure/observability/logger";

/**
 * Writing notifications (#49).
 *
 * The urgent channel. A schedule change has to reach the person by something
 * whose timing we control — which is why this exists rather than leaning on a
 * calendar feed, where the refresh cadence belongs to Google.
 */

/**
 * What happened, as a key rather than a sentence.
 *
 * The `notifications` table stores `title` and `message` as text, so anything
 * written there is frozen in whatever language the server happened to use — the
 * problem #14 is about. These keys go in `metadata` and the sentence is chosen
 * at render time, in the reader's language.
 */
export type NotificationKey =
  | "assignmentAssigned"
  | "assignmentTimeChanged"
  | "assignmentSiteChanged"
  | "assignmentCancelled"
  | "swapProposed"
  | "swapAcceptedByPeer"
  | "swapApproved"
  | "swapRejected";

export interface NotificationParams {
  /** The job's title. Safe to show: it is what the person was told to do. */
  title?: string;
  /** Formatted by the reader's locale at render, so this stays an ISO string. */
  startsAt?: string;
  previousStartsAt?: string;
  siteName?: string;
  personName?: string;
}

type Tone = "INFO" | "SUCCESS" | "WARNING" | "ACTION_REQUIRED";

/**
 * Which key deserves to interrupt someone.
 *
 * A time change is the one that gets people to the wrong place at the wrong
 * hour, so it is the one marked as needing action. Being assigned new work is
 * information; it is not urgent in the same way.
 */
const TONE: Record<NotificationKey, Tone> = {
  assignmentAssigned: "INFO",
  assignmentTimeChanged: "ACTION_REQUIRED",
  assignmentSiteChanged: "ACTION_REQUIRED",
  assignmentCancelled: "WARNING",
  swapProposed: "ACTION_REQUIRED",
  swapAcceptedByPeer: "INFO",
  swapApproved: "SUCCESS",
  swapRejected: "INFO",
};

/**
 * English fallbacks for `title` and `message`, which are NOT NULL columns.
 *
 * Nothing in the interface reads these — the renderer prefers the key in
 * `metadata`. They exist so a row is still legible to someone querying the
 * table directly, and so the column constraint is honest rather than filled
 * with an empty string.
 */
const FALLBACK: Record<NotificationKey, string> = {
  assignmentAssigned: "You have been assigned to a job",
  assignmentTimeChanged: "The time of one of your jobs has changed",
  assignmentSiteChanged: "The site of one of your jobs has changed",
  assignmentCancelled: "One of your jobs was cancelled",
  swapProposed: "A colleague asked you to take their shift",
  swapAcceptedByPeer: "Your colleague accepted the shift swap",
  swapApproved: "Your shift swap was approved",
  swapRejected: "Your shift swap was not approved",
};

export interface NotificationTarget {
  userId: string;
  companyId: string;
}

/**
 * Sends one notification to each recipient.
 *
 * Uses the admin client deliberately. A notification is written *about* one
 * person *by* another — a supervisor changing a shift writes to the worker's
 * row — and no RLS policy can express "you may insert a notification for
 * someone else, but only this kind, and only because of what you just did".
 * The authority check belongs to the action that already did it: nothing calls
 * this without first having been allowed to make the change it announces.
 *
 * Never throws. A failure to notify must not roll back the schedule change that
 * caused it — the change is the important part, and losing it because the
 * notification failed would be a worse outcome than a missing notification.
 */
export async function notify(
  targets: NotificationTarget[],
  key: NotificationKey,
  params: NotificationParams,
  actionUrl = "/dashboard/agenda",
): Promise<void> {
  if (targets.length === 0) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifications").insert(
      targets.map((target) => ({
        user_id: target.userId,
        company_id: target.companyId,
        type: TONE[key],
        title: FALLBACK[key],
        message: FALLBACK[key],
        action_url: actionUrl,
        metadata: { key, params },
      })),
    );

    if (error) {
      log.error({ event: "notification_insert_failed", source: "notify", code: key }, error);
    }
  } catch (error) {
    log.error({ event: "notification_insert_failed", source: "notify", code: key }, error);
  }
}
