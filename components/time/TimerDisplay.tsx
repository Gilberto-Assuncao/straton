import { useTranslations } from "next-intl";

export function formatTimer(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
}

export default function TimerDisplay({ seconds }: { seconds: number }) {
  const t = useTranslations("time");
  const value = formatTimer(seconds);
  return (
    <div className="text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">{t("elapsedTime")}</p>
      <output aria-live="off" aria-label={`${t("elapsedTime")} ${value}`} className="mt-3 block font-mono text-4xl font-bold tabular-nums tracking-tight text-ink min-[360px]:text-5xl sm:text-6xl">
        {value}
      </output>
    </div>
  );
}
