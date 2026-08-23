/**
 * The iCalendar text a phone actually subscribes to (#49, passo 2).
 *
 * Pure, and in its own module with no database and no `server-only`, because
 * every rule below is a format rule that can be got wrong silently: a client
 * that dislikes a line does not report an error, it shows an empty calendar.
 * The tests are the only place these are ever checked.
 *
 * RFC 5545 throughout, with the two extensions every calendar client honours in
 * practice for refresh cadence (`REFRESH-INTERVAL` is in RFC 7986;
 * `X-PUBLISHED-TTL` is what older Outlook reads).
 */

export type FeedEventStatus = "planned" | "sent" | "accepted" | "in_progress" | "done" | "cancelled";

export interface FeedEvent {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: FeedEventStatus;
  location: string | null;
  updatedAt: string;
}

/**
 * How a job's own status reads to a calendar.
 *
 * A cancelled job is published rather than dropped. A subscribed calendar shows
 * removal as absence, and absence is exactly what a stale feed looks like too —
 * so the one case where the worker most needs to be sure would be the one case
 * they could not tell apart from a feed that had stopped updating.
 */
function icsStatus(status: FeedEventStatus): "CONFIRMED" | "TENTATIVE" | "CANCELLED" {
  if (status === "cancelled") return "CANCELLED";
  return status === "planned" || status === "sent" ? "TENTATIVE" : "CONFIRMED";
}

/** `20260822T143000Z`. Always UTC, so no VTIMEZONE has to be shipped or trusted. */
export function icsStamp(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`not a date: ${String(value)}`);
  return `${date.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

/**
 * Escaping, per RFC 5545 §3.3.11.
 *
 * The backslash goes first, and it has to. Escape the separators first and a
 * title containing a semicolon becomes `a\;b`; doubling the backslashes
 * afterwards turns that into `a\\;b`, which is a literal backslash followed by
 * an unescaped separator — the property ends early and the client drops the
 * event, or the file.
 */
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\n|\r/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

/**
 * Folding, per RFC 5545 §3.1: no line over 75 **octets**.
 *
 * Octets, not characters. "Chantier Wemmel — étage" is longer in bytes than in
 * characters, and a fold placed by character count lands in the middle of a
 * multi-byte sequence: the client reads a broken UTF-8 stream and drops the
 * event, or the whole file. So the split is measured on the encoded bytes and
 * only ever falls on a character boundary.
 */
export function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  // A continuation line starts with one space, which counts towards its 75.
  let limit = 75;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
      limit = 74;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function property(name: string, value: string): string {
  return fold(`${name}:${value}`);
}

export interface CalendarOptions {
  /** Shown as the calendar's name in the client. */
  name: string;
  /** Injected rather than read from the clock, so the output is testable. */
  now: Date;
  /** Where a UID's domain part comes from; stable across deployments. */
  domain: string;
}

/**
 * One calendar, ready to serve.
 *
 * `UID` is derived from the assignment id and never from anything that can
 * change. A UID that moves makes every edit look like a delete plus a create:
 * the job leaves the phone and comes back, losing whatever the worker had set
 * on it, and any alarm they had added goes with it.
 */
export function buildCalendar(events: FeedEvent[], options: CalendarOptions): string {
  const stamp = icsStamp(options.now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//STRATON//Agenda//${options.domain}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    property("X-WR-CALNAME", escapeText(options.name)),
    // An hour is the honest ask. Google and Outlook both treat it as a hint and
    // refresh on their own cadence, which is the reason this feed is not where
    // a last-minute change is confirmed.
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];

  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      property("UID", `assignment-${event.id}@${options.domain}`),
      property("DTSTAMP", stamp),
      property("DTSTART", icsStamp(event.startsAt)),
      property("DTEND", icsStamp(event.endsAt)),
      property("SUMMARY", escapeText(event.title)),
      property("STATUS", icsStatus(event.status)),
      property("LAST-MODIFIED", icsStamp(event.updatedAt)),
    );
    if (event.location) lines.push(property("LOCATION", escapeText(event.location)));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  // Trailing CRLF: the last line is a line like any other, and a file that ends
  // without one is rejected outright by stricter parsers.
  return `${lines.join("\r\n")}\r\n`;
}
