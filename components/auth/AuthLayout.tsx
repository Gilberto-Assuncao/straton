import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen overflow-x-hidden bg-[#111827] px-4 py-8 text-[#E5E7EB] sm:px-6 sm:py-12">
      <div aria-hidden="true" className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#22C55E]/15 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-md flex-col justify-center">
        <Link href="/" className="mx-auto mb-8 flex min-h-11 w-fit flex-col items-center justify-center leading-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#22C55E]">
          <span className="text-xl font-bold tracking-[0.16em]">STRATON</span>
          <span className="mt-2 text-[0.6rem] font-medium tracking-[0.2em] text-[#9CA3AF]">TIME WELL MANAGED.</span>
        </Link>
        {children}
      </div>
    </main>
  );
}
