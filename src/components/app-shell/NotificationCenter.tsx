"use client";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import type { AppNotification } from "./types";

function NotificationItem({ item }: { item: AppNotification }) {
  const tShell = useTranslations("appShell");
  const tNotif = useTranslations("notifications");
  const format = useFormatter();

  /**
   * The key wins when it is there.
   *
   * Rows written before #49 have no key and fall back to the English text
   * stored at the time. New ones carry the key and the parameters, so the
   * sentence is built in the reader's language rather than the writer's.
   */
  const title = item.messageKey ? tNotif(`${item.messageKey}_title` as "assignmentAssigned_title") : item.title;
  const body = item.messageKey
    ? tNotif(`${item.messageKey}_body` as "assignmentAssigned_body", {
        title: item.params?.title ?? "",
        site: item.params?.siteName ?? "",
        person: item.params?.personName ?? "",
        area: item.params?.areaName ?? "",
        when: item.params?.startsAt ? format.dateTime(new Date(item.params.startsAt), { dateStyle: "medium", timeStyle: "short" }) : "",
        previously: item.params?.previousStartsAt
          ? format.dateTime(new Date(item.params.previousStartsAt), { dateStyle: "medium", timeStyle: "short" })
          : "",
      })
    : item.description;

  const content = (
    <div className="flex gap-3">
      {item.unread ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#22C55E]" aria-label={tShell("unread")} /> : null}
      <div>
        <h3 className="text-sm font-semibold text-[#E5E7EB]">{title}</h3>
        <p className="mt-1 text-sm text-[#9CA3AF]">{body}</p>
        <time dateTime={item.createdAt} className="mt-2 block text-xs text-[#6B7280]">
          {format.relativeTime(new Date(item.createdAt))}
        </time>
      </div>
    </div>
  );

  return (
    <li className="border-b border-white/10">
      {/*
        A link when there is somewhere to go, plain text otherwise (#83).
        Rendering every notification as a link and letting the dead ones do
        nothing is worse than not linking: the second time a click does nothing,
        people stop clicking the ones that work.

        A real link, not an onClick — so it can be opened in a new tab, and so
        the keyboard reaches it without anything extra.
      */}
      {item.href ? (
        <Link
          href={item.href}
          className="block rounded-lg py-4 transition hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-[#22C55E]"
        >
          {content}
        </Link>
      ) : (
        <div className="py-4">{content}</div>
      )}
    </li>
  );
}

export function NotificationCenter({
  open,
  notifications,
  onClose,
}: {
  open: boolean;
  notifications: AppNotification[];
  onClose: () => void;
}) {
  const tShell = useTranslations("appShell");
  if (!open) return null;

  return (
    <section
      id="notification-center"
      aria-labelledby="notifications-title"
      className="fixed right-3 top-16 z-40 max-h-[min(30rem,calc(100dvh-5rem))] w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-white/10 bg-[#161A34] shadow-2xl"
    >
      <header className="flex min-h-14 items-center justify-between border-b border-white/10 px-4">
        <h2 id="notifications-title" className="font-semibold text-[#E5E7EB]">
          {tShell("notifications")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={tShell("closeNotifications")}
          className="min-h-11 min-w-11 rounded-lg text-[#E5E7EB] focus-visible:outline-2 focus-visible:outline-[#22C55E]"
        >
          ×
        </button>
      </header>
      <ul className="max-h-96 overflow-y-auto p-4">
        {notifications.length ? (
          notifications.map((item) => <NotificationItem key={item.id} item={item} />)
        ) : (
          <li className="p-6 text-center text-sm text-[#9CA3AF]">{tShell("noNotifications")}</li>
        )}
      </ul>
    </section>
  );
}
