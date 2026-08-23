"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  decideSwapAction,
  proposeSwapAction,
  respondToSwapAction,
  withdrawSwapAction,
} from "@/src/features/assignments/swap-actions";
import type { AgendaSwap, AgendaSwapContext } from "@/src/features/assignments/data";
import type { AssignmentRecord } from "@/src/features/assignments/types";

/**
 * Swapping a shift, from the card the shift is on (#25).
 *
 * The database has known how to do this since 202608070001 — the state machine,
 * the two approvals in series, the moment the assignee actually moves. What it
 * never had was a way to ask. A feature that exists only in the schema is a
 * feature nobody has.
 *
 * Everything here is decided by *who is looking*: the same swap shows Accept to
 * the colleague, Withdraw to the person who proposed it, and Approve to the
 * supervisor. Showing all three to everyone and letting the trigger refuse
 * would be a screen full of buttons that fail.
 */
const button =
  "min-h-11 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-brand";
const plain = `${button} border border-edge-15 text-ink hover:bg-edge-5`;

export default function SwapPanel({
  assignment,
  swap,
  context,
}: {
  assignment: AssignmentRecord;
  swap: AgendaSwap | null;
  context: AgendaSwapContext;
}) {
  const t = useTranslations("agenda");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; key: string } | null>(null);
  const [asking, setAsking] = useState(false);

  const mine = context.viewerMembershipId;
  const amAssignee = mine !== null && assignment.assignees.some((person) => person.membershipId === mine);
  const amPeer = swap !== null && swap.toMembershipId === mine;
  const amProposer = swap !== null && swap.fromMembershipId === mine;

  function run(work: () => Promise<{ ok: boolean; message: string }>) {
    startTransition(async () => {
      const result = await work();
      setMessage({ ok: result.ok, key: result.message });
      if (result.ok) setAsking(false);
    });
  }

  // A finished shift cannot be given away, and neither can a cancelled one.
  const swappable = assignment.status !== "done" && assignment.status !== "cancelled";

  if (!swap && (!amAssignee || !swappable || context.colleagues.length === 0)) return null;

  return (
    <div className="mt-3 border-t border-edge-10 pt-3">
      {swap ? (
        <>
          <p className="text-xs text-ink-muted">
            {swap.status === "proposed"
              ? amPeer
                ? t("swapAskedYou", { name: swap.fromName })
                : t("swapWaitingPeer", { name: swap.toName })
              : t("swapWaitingSupervisor", { name: swap.toName })}
          </p>
          {swap.reason ? <p className="mt-1 text-xs text-ink-subtle">{swap.reason}</p> : null}

          <div className="mt-2 flex flex-wrap gap-2">
            {amPeer && swap.status === "proposed" ? (
              <>
                <button type="button" disabled={pending} className={`${button} bg-brand text-on-brand hover:bg-brand-hover`} onClick={() => run(() => respondToSwapAction(swap.id, true))}>
                  {t("swapAccept")}
                </button>
                <button type="button" disabled={pending} className={plain} onClick={() => run(() => respondToSwapAction(swap.id, false))}>
                  {t("swapDecline")}
                </button>
              </>
            ) : null}

            {/*
              The supervisor's Approve appears only once the colleague has said
              yes. Offering it earlier would put the one refusal the trigger
              exists to make behind a button that looks available.
            */}
            {context.isManager && swap.status === "accepted_by_peer" ? (
              <button type="button" disabled={pending} className={`${button} bg-brand text-on-brand hover:bg-brand-hover`} onClick={() => run(() => decideSwapAction(swap.id, true))}>
                {t("swapApprove")}
              </button>
            ) : null}
            {context.isManager ? (
              <button type="button" disabled={pending} className={plain} onClick={() => run(() => decideSwapAction(swap.id, false))}>
                {t("swapRefuse")}
              </button>
            ) : null}

            {amProposer ? (
              <button type="button" disabled={pending} className={plain} onClick={() => run(() => withdrawSwapAction(swap.id))}>
                {t("swapWithdraw")}
              </button>
            ) : null}
          </div>
        </>
      ) : asking ? (
        <form
          action={(formData) => run(() => proposeSwapAction(formData))}
          className="grid gap-2"
        >
          <input type="hidden" name="assignmentId" value={assignment.id} />
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-wide text-ink-subtle">{t("swapColleagueLabel")}</span>
            <select
              name="toMembershipId"
              required
              className="min-h-11 w-full rounded-lg border border-edge-15 bg-canvas px-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-brand"
            >
              {context.colleagues.map((person) => (
                <option key={person.membershipId} value={person.membershipId}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-wide text-ink-subtle">{t("swapReasonLabel")}</span>
            <input
              name="reason"
              maxLength={120}
              className="min-h-11 w-full rounded-lg border border-edge-15 bg-canvas px-2 text-xs text-ink focus-visible:outline-2 focus-visible:outline-brand"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={pending} className={`${button} bg-brand text-on-brand hover:bg-brand-hover`}>
              {t("swapSend")}
            </button>
            <button type="button" disabled={pending} className={plain} onClick={() => setAsking(false)}>
              {t("rescheduleCancel")}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" disabled={pending} className={plain} onClick={() => setAsking(true)}>
          {t("swapPropose")}
        </button>
      )}

      {message ? (
        <p role="status" className={`mt-2 text-xs ${message.ok ? "text-success" : "text-danger-soft"}`}>
          {t(message.key)}
        </p>
      ) : null}
    </div>
  );
}
