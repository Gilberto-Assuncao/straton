import type { IconName } from "@/src/components/ui";
export interface AppNavigationItem { id: string; label: string; href: string; icon?: IconName; badge?: string; disabled?: boolean; children?: AppNavigationItem[]; section?: string; roles?: string[] }
export interface AppCompanyOption { id: string; name: string; logo?: string }
export interface AppUserSummary { name: string; email: string; initials: string }
/**
 * `title` and `description` are the stored English fallbacks. When
 * `messageKey` is present the renderer translates instead — the sentence is
 * chosen in the reader's language rather than the writer's (#14, #49).
 *
 * `createdAt` stays an ISO string so the relative time is formatted by the
 * reader's locale too; it used to be built as "3h ago" on the server.
 */
/**
 * `href` is where the notification came from (#83).
 *
 * Optional because the rows written before this have no target — an old
 * notification becomes plain text rather than a link that goes nowhere, which
 * is the failure people remember.
 */
export interface AppNotification { id: string; title: string; description: string; createdAt: string; unread?: boolean; messageKey?: string; params?: Record<string, string>; href?: string }
export interface QuickAction { id: string; label: string; href: string; icon?: IconName }
