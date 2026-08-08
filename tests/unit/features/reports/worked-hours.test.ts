import { describe, expect, it } from "vitest";
import { formatMinutes, toCsv, type WorkedHoursReport } from "@/src/features/reports/worked-hours-format";

/**
 * The report a company sends to its accountant.
 *
 * A wrong number here is not a broken screen — it is someone paid for the wrong
 * hours, found weeks later. These tests cover the two places that quietly go
 * wrong: the hours-and-minutes formatting, and the CSV a spreadsheet has to be
 * able to add up.
 */

const HEADERS = {
  person: "Person",
  jobTitle: "Role",
  approvedHours: "Approved hours",
  submittedHours: "Hours awaiting approval",
  draftHours: "Draft hours",
  approvedMinutes: "Approved minutes",
  entries: "Entries",
};

function report(people: WorkedHoursReport["people"]): WorkedHoursReport {
  return {
    from: "2026-07-01T00:00:00.000Z",
    to: "2026-08-01T00:00:00.000Z",
    month: "2026-07",
    people,
    sites: [],
    totals: {
      approvedMinutes: people.reduce((sum, person) => sum + person.approvedMinutes, 0),
      submittedMinutes: 0,
      draftMinutes: 0,
    },
  };
}

const person = (name: string, approvedMinutes: number, jobTitle: string | null = "Electrician") => ({
  membershipId: `id-${name}`,
  name,
  jobTitle,
  approvedMinutes,
  submittedMinutes: 0,
  draftMinutes: 0,
  entryCount: 1,
});

describe("formatting hours for people to read", () => {
  it("writes hours and minutes, not decimals", () => {
    // 7.5 hours is "7h30" to anyone doing payroll. A decimal reads like a
    // quantity of something else.
    expect(formatMinutes(450)).toBe("7h30");
  });

  it("drops the minutes when there are none", () => {
    expect(formatMinutes(480)).toBe("8h");
  });

  it("pads single-digit minutes", () => {
    // "8h5" would be read as eight hours five, or eight-oh-five, or a typo.
    expect(formatMinutes(485)).toBe("8h05");
  });

  it("handles zero without inventing a value", () => {
    expect(formatMinutes(0)).toBe("0h");
  });

  it("does not round hours away past a day", () => {
    // Someone with a long month has a four-figure total; it must not wrap.
    expect(formatMinutes(10_000)).toBe("166h40");
  });
});

describe("the CSV an accountant opens", () => {
  it("uses decimal hours, because a spreadsheet has to sum the column", () => {
    // "7h30" does not add up. This column exists to be totalled.
    const csv = toCsv(report([person("Ana", 450)]), HEADERS);
    expect(csv).toContain("7.50");
  });

  it("carries the raw minutes as well, so nothing depends on the rounding", () => {
    const csv = toCsv(report([person("Ana", 451)]), HEADERS);
    expect(csv).toContain("451");
  });

  it("separates with semicolons", () => {
    // A comma is the decimal separator in a Belgian locale, and Excel then puts
    // the whole row into one cell.
    const csv = toCsv(report([person("Ana", 60)]), HEADERS);
    expect(csv.split("\r\n")[0].split(";")).toHaveLength(7);
  });

  it("quotes a value containing the separator instead of breaking the row", () => {
    const csv = toCsv(report([person("Silva; Ana", 60)]), HEADERS);
    expect(csv).toContain('"Silva; Ana"');
    // Still seven fields: the name did not leak into the next column.
    expect(csv.split("\r\n")[1].split(";")).toHaveLength(8); // one extra from the quoted split
    expect(csv.split("\r\n")[1].startsWith('"Silva; Ana";')).toBe(true);
  });

  it("escapes a quote inside a value", () => {
    const csv = toCsv(report([person('The "Boss"', 60)]), HEADERS);
    expect(csv).toContain('"The ""Boss""";');
  });

  it("survives a person with no job title", () => {
    const csv = toCsv(report([person("Ana", 60, null)]), HEADERS);
    expect(csv.split("\r\n")[1]).toBe("Ana;;1.00;0.00;0.00;60;1");
  });

  it("ends every line with CRLF", () => {
    // Excel on Windows is the target, and a bare LF makes it show one long row.
    const csv = toCsv(report([person("Ana", 60)]), HEADERS);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("writes a header even when nobody worked", () => {
    // An empty file looks like a failed export; a header with no rows is an
    // answer.
    const csv = toCsv(report([]), HEADERS);
    expect(csv.split("\r\n")[0]).toContain("Person");
  });
});
