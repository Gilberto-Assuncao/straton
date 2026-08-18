"use client";
import { useTranslations } from "next-intl";
import { AUTHOR } from "@/src/config/author";

export function AppFooter() {
  const tShell = useTranslations("appShell");
  return (
    <footer className="border-t border-edge-10 px-4 py-4 text-center text-xs text-ink-subtle">
      <span className="font-semibold text-ink-muted">STRATON</span>
      <span aria-hidden="true"> · </span>
      Time Well Managed
      <span aria-hidden="true"> · </span>
      {tShell("developedBy")}{" "}
      {/*
        `rel="noreferrer"` alongside `noopener` because this is the one link in
        the shell that leaves the product: a tab opened with `target="_blank"`
        gets `window.opener` unless it is told not to.
      */}
      <a
        href={AUTHOR.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold text-ink-muted underline underline-offset-2 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {AUTHOR.name}
      </a>
    </footer>
  );
}
