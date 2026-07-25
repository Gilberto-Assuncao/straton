import type { AuthProvider } from "@/src/application/auth/auth-provider";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  provider: AuthProvider;
}

export interface SessionCompany {
  id: string;
  name: string;
  membershipId: string;
  roles: string[];
  status: "active" | "inactive" | "suspended" | "archived";
}

export interface AuthenticatedSession {
  user: SessionUser;
  companies: SessionCompany[];
  activeCompany: SessionCompany | null;
}

export const ACTIVE_COMPANY_COOKIE = "straton-active-company";
