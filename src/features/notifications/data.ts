import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireAuthenticatedSession } from "@/src/application/session/server";
import type { AppNotification } from "@/src/components/app-shell/types";

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
  metadata: { key?: string; params?: Record<string, string> } | null;
}

export async function getNotifications(): Promise<AppNotification[]> {
  const session = await requireAuthenticatedSession();
  const supabase = await createClient();

  const { data } = await supabase
    .from("notifications")
    .select("id,title,message,read_at,created_at,metadata")
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return ((data ?? []) as NotificationRow[]).map((row) => ({
    id: row.id,
    // Kept as the last resort for rows written before #49, which have no key.
    title: row.title,
    description: row.message,
    // Was formatted here as "3h ago" — English, on the server, regardless of
    // the reader. The component formats it now, in their locale.
    createdAt: row.created_at,
    unread: row.read_at === null,
    messageKey: row.metadata?.key,
    params: row.metadata?.params,
  }));
}
