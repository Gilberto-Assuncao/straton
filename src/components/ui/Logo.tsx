import Link from "next/link";
import { StratonMark } from "./StratonMark";

export function Logo({ compact = false, href = "/dashboard" }: { compact?: boolean; href?: string }) {
  return (
    <Link href={href} aria-label="STRATON dashboard" className="inline-flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright">
      <StratonMark className="h-7 w-7 shrink-0" id="logo" />
      {compact ? null : (
        <span className="inline-flex flex-col">
          <span className="font-bold tracking-[0.16em] text-ink">STRATON</span>
          <span className="mt-1 text-[10px] tracking-[0.14em] text-brand-bright">TIME WELL MANAGED</span>
        </span>
      )}
    </Link>
  );
}
