export const ASSIGNMENT_STATUSES = ["planned", "sent", "accepted", "in_progress", "done", "cancelled"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

/**
 * What a worker may do to a job they were given.
 *
 * Deliberately not a free choice of any status: 'planned' and 'sent' are the
 * supervisor's side of the conversation, and letting an assignee push a job
 * back to 'planned' would quietly undo the fact that it was ever sent.
 */
export const WORKER_TRANSITIONS: Record<AssignmentStatus, AssignmentStatus[]> = {
  planned: [],
  sent: ["accepted"],
  accepted: ["in_progress"],
  in_progress: ["done"],
  done: [],
  cancelled: [],
};

export interface AssignmentAssignee {
  membershipId: string;
  name: string;
  /** 'team' means the person arrived through a team booking, not picked by hand. */
  source: "direct" | "team";
}

export interface AssignmentRecord {
  id: string;
  title: string;
  instructions: string | null;
  startsAt: string;
  endsAt: string;
  status: AssignmentStatus;
  siteId: string | null;
  siteName: string | null;
  projectName: string | null;
  /** Set when the booking was made as a team, so the UI can say so. */
  teamId: string | null;
  teamName: string | null;
  assignees: AssignmentAssignee[];
  /** Whether the viewer may edit the work itself. */
  canManage: boolean;
  /** Statuses the viewer may move this to right now. */
  availableTransitions: AssignmentStatus[];
}

export interface AgendaDay {
  /** YYYY-MM-DD */
  date: string;
  assignments: AssignmentRecord[];
}
