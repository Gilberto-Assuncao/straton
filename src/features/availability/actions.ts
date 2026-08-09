"use server";

import { revalidatePath } from "next/cache";
import { requireActiveCompany } from "@/src/application/session/server";
import { createClient } from "@/src/infrastructure/supabase/server";
import { parseAvailability, type AvailabilityErrorKey } from "./validation";

export type AvailabilityMessageKey =
  | AvailabilityErrorKey
  | "created"
  | "deleted"
  | "overlaps"
  | "notAllowed"
  | "failed";

/**
 * What was typed, echoed back with the answer.
 *
 * A server action gets a fresh form on every render, so an uncontrolled input
 * comes back empty after a refusal — you lose the dates and the note and have
 * to type them again, next to an error message that is still describing the
 * attempt you can no longer see. Reported exactly that way.
 *
 * So the values travel with the result and the form seeds itself from them. On
 * success they are dropped, because then the form should be empty.
 */
export interface AvailabilityValues {
  membershipId: string;
  kind: string;
  startsAt: string;
  endsAt: string;
  reason: string;
  note: string;
}

export type AvailabilityState = {
  status: "idle" | "error" | "success";
  message: AvailabilityMessageKey | null;
  values?: AvailabilityValues;
};

function submitted(formData: FormData): AvailabilityValues {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    membershipId: text("membershipId"),
    kind: text("kind"),
    startsAt: text("startsAt"),
    endsAt: text("endsAt"),
    reason: text("reason"),
    note: text("note"),
  };
}

const MANAGER_ROLES = ["owner", "admin", "administrator", "manager"];

export async function declareAvailabilityAction(
  _: AvailabilityState,
  formData: FormData,
): Promise<AvailabilityState> {
  const { companyId, session } = await requireActiveCompany();
  const values = submitted(formData);
  const membership = session.activeCompany;
  if (!membership) return { status: "error", message: "notAllowed", values };

  const parsed = parseAvailability(formData);
  if ("error" in parsed) return { status: "error", message: parsed.error, values };

  // Checked here as well as in RLS: a refusal that arrives as a generic
  // database error tells the person nothing about what they did wrong.
  const isManager = membership.roles.some((role) => MANAGER_ROLES.includes(role));
  if (!isManager && parsed.membershipId !== membership.membershipId) {
    return { status: "error", message: "notAllowed", values };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("worker_availability").insert({
    company_id: companyId,
    company_membership_id: parsed.membershipId,
    starts_at: parsed.startsAt,
    ends_at: parsed.endsAt,
    kind: parsed.kind,
    reason: parsed.reason,
    note: parsed.note,
    created_by: session.user.id,
  });

  if (error) {
    // 23P01 is the exclusion constraint: the same person already has a
    // declaration of this kind covering part of that window.
    return { status: "error", message: error.code === "23P01" ? "overlaps" : "failed", values };
  }

  revalidatePath("/dashboard/availability");
  return { status: "success", message: "created" };
}

export async function deleteAvailabilityAction(id: string): Promise<AvailabilityState> {
  await requireActiveCompany();

  const supabase = await createClient();
  // No ownership check here on purpose: the delete policy already restricts
  // this to your own records or, for a manager, your company's. Repeating it
  // would be a second rule to keep in step with the first.
  const { error } = await supabase.from("worker_availability").delete().eq("id", id);
  if (error) return { status: "error", message: "failed" };

  revalidatePath("/dashboard/availability");
  return { status: "success", message: "deleted" };
}
