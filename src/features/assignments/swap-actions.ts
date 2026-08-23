"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { log } from "@/src/infrastructure/observability/logger";
import { notify } from "@/src/features/notifications/publish";

/**
 * Swapping a shift with a colleague (#25).
 *
 * The state machine lives in the database — `enforce_assignment_swap` decides
 * who may make which transition, and moves the assignee on approval, in the
 * same statement as the approval. Nothing here re-implements it.
 *
 * What this file does is check the same preconditions *first*, so the person
 * gets a sentence they can act on. The trigger's own refusals are English
 * exceptions quoting the offending value; returning one to the screen is the
 * defect #27 exists for, so a refusal that gets past the checks below comes
 * back as `swapFailed` and the code goes to the log.
 */
export type SwapMessageKey =
  | "swapSent"
  | "swapAccepted"
  | "swapDeclined"
  | "swapApproved"
  | "swapRefused"
  | "swapWithdrawn"
  | "swapNotYours"
  | "swapAlreadyOpen"
  | "swapAlreadyAnswered"
  | "swapNotAllowed"
  | "swapFailed";

export interface SwapResult {
  ok: boolean;
  message: SwapMessageKey;
}

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager", "supervisor"];

/** Postgres' unique-violation. Here it means: this shift already has a swap. */
const UNIQUE_VIOLATION = "23505";

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

interface SwapContext {
  id: string;
  assignment_id: string;
  status: string;
  from_membership_id: string;
  to_membership_id: string;
}

/** The job, and the two people, for the notification the caller is about to send. */
async function assignmentFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  assignmentId: string,
): Promise<{ title: string; startsAt: string } | null> {
  const { data } = await supabase
    .from("assignments")
    .select("title,starts_at")
    .eq("id", assignmentId)
    .maybeSingle();
  return data ? { title: data.title as string, startsAt: data.starts_at as string } : null;
}

async function userFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  membershipId: string,
): Promise<{ userId: string; name: string } | null> {
  const { data } = await supabase
    .from("company_memberships")
    .select("user_id,users!company_memberships_user_id_fkey(name)")
    .eq("id", membershipId)
    .maybeSingle();
  if (!data) return null;
  const related = (data as { user_id: string; users: { name: string } | { name: string }[] | null }).users;
  const person = Array.isArray(related) ? related[0] : related;
  return { userId: data.user_id as string, name: person?.name ?? "" };
}

export async function proposeSwapAction(formData: FormData): Promise<SwapResult> {
  const { companyId, session } = await requireActiveCompany();
  const mine = session.activeCompany?.membershipId;
  if (!mine) return { ok: false, message: "swapFailed" };

  const assignmentId = text(formData, "assignmentId");
  const toMembershipId = text(formData, "toMembershipId");
  if (!assignmentId || !toMembershipId) return { ok: false, message: "swapFailed" };
  if (toMembershipId === mine) return { ok: false, message: "swapNotAllowed" };

  const supabase = await createClient();

  // Checked here as well as in the policy, because a policy refuses by matching
  // no rows: without this the person would be told the request was sent and
  // nothing would exist.
  const { data: onIt } = await supabase
    .from("assignment_assignees")
    .select("id")
    .eq("assignment_id", assignmentId)
    .eq("company_membership_id", mine);
  if (!onIt || onIt.length === 0) return { ok: false, message: "swapNotYours" };

  const { data, error } = await supabase
    .from("assignment_swaps")
    .insert({
      company_id: companyId,
      assignment_id: assignmentId,
      from_membership_id: mine,
      to_membership_id: toMembershipId,
      reason: text(formData, "reason") || null,
    })
    .select("id");

  if (error) {
    // The partial unique index. One live proposal per shift is the rule that
    // stops two approvals from silently overwriting each other.
    if (error.code === UNIQUE_VIOLATION) return { ok: false, message: "swapAlreadyOpen" };
    log.error({ event: "swap_insert_failed", source: "proposeSwapAction", companyId, code: error.code });
    return { ok: false, message: "swapFailed" };
  }
  if (!data || data.length === 0) {
    log.error({ event: "swap_insert_no_rows", source: "proposeSwapAction", companyId });
    return { ok: false, message: "swapFailed" };
  }

  const [job, peer, proposer] = await Promise.all([
    assignmentFor(supabase, assignmentId),
    userFor(supabase, toMembershipId),
    userFor(supabase, mine),
  ]);
  if (peer && job) {
    await notify([{ userId: peer.userId, companyId }], "swapProposed", {
      title: job.title,
      startsAt: job.startsAt,
      personName: proposer?.name,
    });
  }

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "swapSent" };
}

/** Reads the swap the caller is about to act on, or nothing if it is not theirs to see. */
async function loadSwap(
  supabase: Awaited<ReturnType<typeof createClient>>,
  swapId: string,
): Promise<SwapContext | null> {
  const { data } = await supabase
    .from("assignment_swaps")
    .select("id,assignment_id,status,from_membership_id,to_membership_id")
    .eq("id", swapId)
    .maybeSingle();
  return (data as SwapContext | null) ?? null;
}

/**
 * The colleague's answer.
 *
 * `.eq("status", …)` on the update is not belt and braces: two taps on a phone
 * with a slow connection are two updates, and the second would move a swap that
 * had already been answered.
 */
export async function respondToSwapAction(swapId: string, accept: boolean): Promise<SwapResult> {
  const { companyId, session } = await requireActiveCompany();
  const mine = session.activeCompany?.membershipId;
  const supabase = await createClient();

  const swap = await loadSwap(supabase, swapId);
  if (!swap) return { ok: false, message: "swapFailed" };
  if (swap.to_membership_id !== mine) return { ok: false, message: "swapNotAllowed" };
  if (swap.status !== "proposed") return { ok: false, message: "swapAlreadyAnswered" };

  const { data, error } = await supabase
    .from("assignment_swaps")
    .update({ status: accept ? "accepted_by_peer" : "rejected" })
    .eq("id", swapId)
    .eq("status", "proposed")
    .select("id");

  if (error) {
    log.error({ event: "swap_respond_failed", source: "respondToSwapAction", companyId, code: error.code });
    return { ok: false, message: "swapFailed" };
  }
  if (!data || data.length === 0) return { ok: false, message: "swapAlreadyAnswered" };

  const [job, proposer, peer] = await Promise.all([
    assignmentFor(supabase, swap.assignment_id),
    userFor(supabase, swap.from_membership_id),
    userFor(supabase, swap.to_membership_id),
  ]);
  if (proposer && job) {
    await notify(
      [{ userId: proposer.userId, companyId }],
      accept ? "swapAcceptedByPeer" : "swapRejected",
      { title: job.title, startsAt: job.startsAt, personName: peer?.name },
    );
  }

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: accept ? "swapAccepted" : "swapDeclined" };
}

/**
 * The supervisor's decision, and the moment the shift actually changes hands.
 *
 * Approving is refused unless the colleague has already accepted — by the
 * trigger, and by the check here so the reason is sayable. A supervisor
 * approving a transfer one side knows nothing about is how somebody finds out
 * on the day.
 */
export async function decideSwapAction(swapId: string, approve: boolean): Promise<SwapResult> {
  const { companyId, session } = await requireActiveCompany();
  if (!session.activeCompany?.roles.some((role) => MANAGER_ROLES.includes(role))) {
    return { ok: false, message: "swapNotAllowed" };
  }

  const supabase = await createClient();
  const swap = await loadSwap(supabase, swapId);
  if (!swap) return { ok: false, message: "swapFailed" };
  if (approve && swap.status !== "accepted_by_peer") return { ok: false, message: "swapAlreadyAnswered" };
  if (!approve && !["proposed", "accepted_by_peer"].includes(swap.status)) {
    return { ok: false, message: "swapAlreadyAnswered" };
  }

  const { data, error } = await supabase
    .from("assignment_swaps")
    .update({ status: approve ? "approved" : "rejected" })
    .eq("id", swapId)
    .eq("status", swap.status)
    .select("id");

  if (error) {
    log.error({ event: "swap_decide_failed", source: "decideSwapAction", companyId, code: error.code });
    return { ok: false, message: "swapFailed" };
  }
  if (!data || data.length === 0) return { ok: false, message: "swapAlreadyAnswered" };

  // Both sides are told, and that is the point of the notification rather than
  // a nicety: on approval the shift has just changed hands, and the person who
  // no longer has it needs to know as much as the person who now does.
  const [job, proposer, peer] = await Promise.all([
    assignmentFor(supabase, swap.assignment_id),
    userFor(supabase, swap.from_membership_id),
    userFor(supabase, swap.to_membership_id),
  ]);
  const targets = [proposer, peer]
    .filter((person): person is { userId: string; name: string } => person !== null)
    .map((person) => ({ userId: person.userId, companyId }));
  if (job && targets.length > 0) {
    await notify(targets, approve ? "swapApproved" : "swapRejected", {
      title: job.title,
      startsAt: job.startsAt,
      personName: peer?.name,
    });
  }

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: approve ? "swapApproved" : "swapRefused" };
}

/** Taking the request back, which only the person who made it may do. */
export async function withdrawSwapAction(swapId: string): Promise<SwapResult> {
  const { companyId, session } = await requireActiveCompany();
  const mine = session.activeCompany?.membershipId;
  const supabase = await createClient();

  const swap = await loadSwap(supabase, swapId);
  if (!swap) return { ok: false, message: "swapFailed" };
  if (swap.from_membership_id !== mine) return { ok: false, message: "swapNotAllowed" };
  if (!["proposed", "accepted_by_peer"].includes(swap.status)) {
    return { ok: false, message: "swapAlreadyAnswered" };
  }

  const { data, error } = await supabase
    .from("assignment_swaps")
    .update({ status: "cancelled" })
    .eq("id", swapId)
    .eq("status", swap.status)
    .select("id");

  if (error) {
    log.error({ event: "swap_withdraw_failed", source: "withdrawSwapAction", companyId, code: error.code });
    return { ok: false, message: "swapFailed" };
  }
  if (!data || data.length === 0) return { ok: false, message: "swapAlreadyAnswered" };

  revalidatePath("/dashboard/agenda");
  return { ok: true, message: "swapWithdrawn" };
}
