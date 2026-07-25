import type { SVGAttributes } from "react";
export type IconName = "plus" | "search" | "close" | "check" | "warning" | "chevron" | "location" | "menu" | "dashboard" | "clock" | "calendar" | "people" | "layers" | "chart" | "gear" | "building" | "globe";
const paths: Record<IconName, string> = {
  plus: "M12 5v14M5 12h14",
  search: "m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  close: "M6 6l12 12M18 6 6 18",
  check: "m5 12 4 4L19 6",
  warning: "M12 9v4m0 4h.01M10.3 3.6 2 1.2 9.7 16.8H.6L10.3 3.6Z",
  chevron: "m9 18 6-6-6-6",
  location: "M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Zm-8 2.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  dashboard: "M4 4h6v7H4zM14 4h6v4h-6zM14 11h6v9h-6zM4 14h6v6H4z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  calendar: "M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1ZM4 9h16M8 3v3M16 3v3",
  people: "M8 8.2a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM17 9.6a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8ZM2.5 20c0-3.3 2.5-6 5.5-6s5.5 2.7 5.5 6M14.5 20c0-2.6 1.9-4.7 4.2-4.7s4.2 2.1 4.2 4.7",
  layers: "M12 3l9 4-9 4-9-4z M3 12l9 4 9-4 M3 17l9 4 9-4",
  chart: "M4 4v16h16 M8 16l3-4 3 2 4-6",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z",
  building: "M4 21V7l8-4 8 4v14 M9 21v-6h6v6 M8 11h.01M12 11h.01M16 11h.01M8 15h.01M16 15h.01",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18M3 12h18",
};
export function Icon({ name, label, size = 20, ...props }: { name: IconName; label?: string; size?: number } & SVGAttributes<SVGElement>) { return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role={label ? "img" : undefined} aria-hidden={label ? undefined : true} aria-label={label} {...props}><path d={paths[name]}/></svg>; }
