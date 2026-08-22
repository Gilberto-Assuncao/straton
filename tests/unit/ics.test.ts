import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, fold, icsStamp, type FeedEvent } from "@/src/features/assignments/ics";

/**
 * The calendar file, checked the way a calendar client reads it (#49, passo 2).
 *
 * Every rule here fails silently in production. A client that dislikes a line
 * does not report an error and does not show a warning — it shows an empty
 * calendar, or drops the one event that was malformed, and the worker finds out
 * by not turning up. None of it is visible in a screenshot, a type check or a
 * build, so this file is the only place any of it is ever checked.
 */
const BASE: FeedEvent = {
  id: "11111111-2222-3333-4444-555555555555",
  title: "Chantier Wemmel",
  startsAt: "2026-08-24T07:30:00.000Z",
  endsAt: "2026-08-24T16:00:00.000Z",
  status: "accepted",
  location: "Chantier Wemmel, Rue de la Station 4, 1780, Wemmel",
  updatedAt: "2026-08-22T21:00:00.000Z",
};

const OPTIONS = { name: "STRATON — João Ferreira", now: new Date("2026-08-22T22:00:00Z"), domain: "straton.be" };

/** What a client does before it parses anything: reverse the folding. */
function unfold(text: string): string {
  return text.replace(/\r\n /g, "");
}

function lines(text: string): string[] {
  return text.split("\r\n").filter(Boolean);
}

describe("icsStamp", () => {
  it("writes UTC in the basic format", () => {
    expect(icsStamp("2026-08-24T07:30:00.000Z")).toBe("20260824T073000Z");
    expect(icsStamp(new Date("2026-01-02T03:04:05Z"))).toBe("20260102T030405Z");
  });

  it("refuses a value that is not a date", () => {
    // Silently emitting "InvalidDate" would produce a file that parses as far
    // as the event and then drops it.
    expect(() => icsStamp("last tuesday")).toThrow();
  });
});

describe("escapeText", () => {
  it("escapes the three separators and the newline", () => {
    expect(escapeText("a,b")).toBe("a\\,b");
    expect(escapeText("a;b")).toBe("a\\;b");
    expect(escapeText("line one\nline two")).toBe("line one\\nline two");
    expect(escapeText("a\\b")).toBe("a\\\\b");
  });

  it("escapes the backslash first", () => {
    // The order is the whole test. A title holding one backslash and one
    // semicolon: escaping the semicolon first gives `a\\;b`, and doubling the
    // backslashes afterwards gives `a\\\\;b` — two literal backslashes and a
    // separator nobody escaped, which ends the property early and takes the
    // event with it.
    expect(escapeText("a\\;b")).toBe("a\\\\\\;b");
  });

  it("leaves ordinary text alone", () => {
    expect(escapeText("Chantier Wemmel")).toBe("Chantier Wemmel");
  });
});

describe("fold", () => {
  it("leaves a short line alone", () => {
    expect(fold("SUMMARY:Chantier Wemmel")).toBe("SUMMARY:Chantier Wemmel");
  });

  it("never emits a line over 75 octets", () => {
    const long = `SUMMARY:${"a".repeat(300)}`;
    const folded = fold(long);
    expect(folded).not.toBe(long);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("counts octets, not characters", () => {
    // The failure this exists for: "é" is two bytes. Folding at 75 *characters*
    // produces lines of up to 150 bytes, which is over the limit for every
    // parser that enforces it — and the accented text here is Belgian, not
    // hypothetical.
    const folded = fold(`SUMMARY:${"é".repeat(120)}`);
    for (const line of folded.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });

  it("never splits a character in half", () => {
    // A fold landing between the two bytes of "é" hands the client a broken
    // UTF-8 stream. Unfolding has to give back exactly what went in.
    const original = `SUMMARY:${"éàü".repeat(60)}`;
    expect(unfold(fold(original))).toBe(original);
  });

  it("starts each continuation with a single space", () => {
    const folded = fold(`SUMMARY:${"a".repeat(200)}`);
    const [, ...continuations] = folded.split("\r\n");
    expect(continuations.length).toBeGreaterThan(0);
    for (const line of continuations) expect(line.startsWith(" ")).toBe(true);
  });
});

describe("buildCalendar", () => {
  const calendar = buildCalendar([BASE], OPTIONS);

  it("produces a calendar a client would accept", () => {
    // The assertion that keeps the rest honest: if the builder returned an
    // empty string, every "does not contain" check below would pass.
    expect(lines(calendar).length).toBeGreaterThan(10);
    expect(calendar.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(calendar).toContain("VERSION:2.0");
  });

  it("ends every line with CRLF, including the last", () => {
    // A bare LF is the single most common reason a hand-built .ics is rejected.
    expect(/[^\r]\n/.test(calendar)).toBe(false);
    expect(calendar.endsWith("\r\n")).toBe(true);
  });

  it("carries the hours in UTC", () => {
    expect(calendar).toContain("DTSTART:20260824T073000Z");
    expect(calendar).toContain("DTEND:20260824T160000Z");
    expect(calendar).toContain("DTSTAMP:20260822T220000Z");
  });

  it("keys the event on the assignment, so an edit is an edit", () => {
    // A UID that moves makes every change look like a delete plus a create: the
    // job leaves the phone and comes back, taking any alarm the worker set with
    // it. So it must not depend on anything that can change.
    const moved = buildCalendar([{ ...BASE, startsAt: "2026-08-25T09:00:00.000Z", title: "Other" }], OPTIONS);
    expect(calendar).toContain(`UID:assignment-${BASE.id}@straton.be`);
    expect(moved).toContain(`UID:assignment-${BASE.id}@straton.be`);
  });

  it("says what a status means to a calendar", () => {
    const status = (event: Partial<FeedEvent>) =>
      lines(buildCalendar([{ ...BASE, ...event }], OPTIONS)).find((line) => line.startsWith("STATUS:"));
    expect(status({ status: "planned" })).toBe("STATUS:TENTATIVE");
    expect(status({ status: "sent" })).toBe("STATUS:TENTATIVE");
    expect(status({ status: "accepted" })).toBe("STATUS:CONFIRMED");
    expect(status({ status: "in_progress" })).toBe("STATUS:CONFIRMED");
    expect(status({ status: "done" })).toBe("STATUS:CONFIRMED");
    expect(status({ status: "cancelled" })).toBe("STATUS:CANCELLED");
  });

  it("publishes a cancelled job rather than dropping it", () => {
    // Removal shows up in a subscribed calendar as absence — and so does a feed
    // that has stopped updating. Dropping the event would make the one case the
    // worker most needs to be sure about indistinguishable from a broken link.
    const cancelled = buildCalendar([{ ...BASE, status: "cancelled" }], OPTIONS);
    expect(cancelled).toContain(`UID:assignment-${BASE.id}@straton.be`);
    expect(cancelled).toContain("STATUS:CANCELLED");
  });

  it("escapes a title that would otherwise end the line early", () => {
    const tricky = buildCalendar([{ ...BASE, title: "Wemmel, étage 2; bloc B" }], OPTIONS);
    expect(unfold(tricky)).toContain("SUMMARY:Wemmel\\, étage 2\\; bloc B");
  });

  it("survives a title long enough to need folding", () => {
    const title = "Chantier ".repeat(20).trim();
    const long = buildCalendar([{ ...BASE, title }], OPTIONS);
    for (const line of lines(long)) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
    expect(unfold(long)).toContain(`SUMMARY:${title}`);
  });

  it("omits the location entirely when there is no site", () => {
    // Not an empty LOCATION: a client shows an empty location as a blank line
    // in the event, which reads like an address that failed to load.
    const nowhere = buildCalendar([{ ...BASE, location: null }], OPTIONS);
    expect(nowhere).not.toContain("LOCATION");
  });

  it("carries nothing but the four fields the issue allows", () => {
    // The privacy rule from #49, checked on the output: title, hours, place.
    // No description property exists at all, so instructions and notes have
    // nowhere to travel even if a future caller passes them.
    expect(calendar).not.toContain("DESCRIPTION");
    expect(calendar).not.toContain("ATTENDEE");
    expect(calendar).not.toContain("ORGANIZER");
  });

  it("serves an empty week as an empty calendar", () => {
    // A worker with nothing booked gets a valid, empty file — not an error, and
    // not a missing one. Their calendar app must show an empty week rather than
    // a broken subscription.
    const empty = buildCalendar([], OPTIONS);
    expect(empty).toContain("BEGIN:VCALENDAR");
    expect(empty).not.toContain("BEGIN:VEVENT");
  });

  it("names the calendar and asks for an hourly refresh", () => {
    expect(unfold(calendar)).toContain("X-WR-CALNAME:STRATON — João Ferreira");
    expect(calendar).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  });
});
