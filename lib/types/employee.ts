export type EmployeeStatus = "active" | "invited" | "inactive";
export type EmploymentType = "employee" | "contractor" | "temporary";

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  /**
   * `null` when the person is on no team, which is a legitimate state.
   *
   * This used to be the string "Unassigned", which every consumer then treated
   * as a team name — it appeared in the team filter as though it were one, and
   * the edit form submitted it and was told to "select a valid team".
   */
  team: string | null;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  hourlyRate?: number;
  startDate: string;
  avatarInitials: string;
  totalHoursThisWeek: number;
  createdAt: string;
};
