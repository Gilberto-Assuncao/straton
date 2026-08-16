import type { ReactNode } from "react";

type PageHeaderProps = { title: string; description?: string; eyebrow?: string; actions?: ReactNode; headingId?: string };
export default function PageHeader({ title, description, eyebrow, actions, headingId }: PageHeaderProps) {
  return <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div>{eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-bright">{eyebrow}</p> : null}<h2 id={headingId} className={`${eyebrow ? "mt-2 " : ""}text-2xl font-bold tracking-tight text-ink sm:text-3xl`}>{title}</h2>{description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">{description}</p> : null}</div>{actions ? <div className="flex flex-col gap-3 sm:flex-row">{actions}</div> : null}</div>;
}
