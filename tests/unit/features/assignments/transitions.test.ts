import { describe, expect, it } from "vitest";
import { ASSIGNMENT_STATUSES, WORKER_TRANSITIONS } from "@/src/features/assignments/types";
import type { AssignmentStatus } from "@/src/features/assignments/types";

/**
 * What a worker may do to a job they were given.
 *
 * The table is deliberately not "any status to any status". A worker pushing a
 * job back to 'planned' would erase the fact that it was ever sent to them,
 * and a worker cancelling work is a decision that belongs to whoever scheduled
 * it.
 */
describe("worker status transitions", () => {
  it("covers every status, so a new one cannot be silently unhandled", () => {
    // Adding a status to the union without adding it here would leave
    // WORKER_TRANSITIONS[status] undefined and crash at the point of use.
    for (const status of ASSIGNMENT_STATUSES) {
      expect(WORKER_TRANSITIONS[status], `no entry for "${status}"`).toBeDefined();
    }
  });

  it("walks the job forward one step at a time", () => {
    expect(WORKER_TRANSITIONS.sent).toEqual(["accepted"]);
    expect(WORKER_TRANSITIONS.accepted).toEqual(["in_progress"]);
    expect(WORKER_TRANSITIONS.in_progress).toEqual(["done"]);
  });

  it("never lets a worker move a job backwards", () => {
    const order: AssignmentStatus[] = ["planned", "sent", "accepted", "in_progress", "done"];
    for (const [index, status] of order.entries()) {
      for (const next of WORKER_TRANSITIONS[status]) {
        expect(order.indexOf(next), `${status} → ${next} goes backwards`).toBeGreaterThan(index);
      }
    }
  });

  it("gives a worker nothing to do with a job that is planned, done or cancelled", () => {
    // 'planned' is the supervisor's side of the conversation — the job has not
    // been sent yet, so there is nothing to accept.
    expect(WORKER_TRANSITIONS.planned).toEqual([]);
    expect(WORKER_TRANSITIONS.done).toEqual([]);
    expect(WORKER_TRANSITIONS.cancelled).toEqual([]);
  });

  it("never offers cancelling as a worker move", () => {
    // Cancelling work is the scheduler's decision, not the assignee's.
    for (const status of ASSIGNMENT_STATUSES) {
      expect(WORKER_TRANSITIONS[status]).not.toContain("cancelled");
    }
  });

  it("only ever offers statuses that exist", () => {
    for (const status of ASSIGNMENT_STATUSES) {
      for (const next of WORKER_TRANSITIONS[status]) {
        expect(ASSIGNMENT_STATUSES).toContain(next);
      }
    }
  });
});
