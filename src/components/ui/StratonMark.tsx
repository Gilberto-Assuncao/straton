// The STRATON mark: three stacked isometric layers, echoing shifts stacking
// into a period. Gradient ids are namespaced by `id` so several marks can be
// rendered on the same page without their <defs> colliding.
export function StratonMark({ className, id = "mark" }: { className?: string; id?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={className} fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4ADE80" />
          <stop offset="1" stopColor="#22C55E" />
        </linearGradient>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22C55E" />
          <stop offset="1" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#16A34A" />
          <stop offset="1" stopColor="#14532D" />
        </linearGradient>
      </defs>
      <path d="M22 5L36 13L22 21L8 13Z" fill={`url(#${id}-a)`} />
      <path d="M8 13L22 21L22 30L8 22Z" fill={`url(#${id}-c)`} />
      <path d="M22 21L22 30L36 22L36 13Z" fill={`url(#${id}-b)`} />
      <path d="M8 22L22 30L22 39L8 31Z" fill={`url(#${id}-b)`} />
      <path d="M22 30L36 22L36 31L22 39Z" fill={`url(#${id}-c)`} />
    </svg>
  );
}
