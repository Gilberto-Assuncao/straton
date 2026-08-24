import { describe, expect, it } from "vitest";
import {
  AUTHORED_HELP_LOCALES,
  HELP_GUIDES,
  guideOrderFor,
  resolveHelpGuide,
  type HelpGuideId,
} from "@/src/content/help";
import { locales } from "@/src/i18n/routing";

/**
 * The in-app manual (#46).
 *
 * Two different things are checked here, and the second is the one that
 * matters. The first is shape: no empty guide, no section that exists in one
 * language and not another — failures that would render perfectly and say
 * nothing.
 *
 * The second is that the manual still explains the seven rules the issue was
 * opened about. Those are the deliberate behaviours that look like defects —
 * booking a team freezes its members, availability warns rather than blocks,
 * delegation shows less than collaboration — and they are the reason this
 * exists at all. A guide that drifts into describing buttons and stops
 * explaining rules is back to being useless, and nothing else would notice.
 */
describe("the guides", () => {
  it("exist in every language they claim", () => {
    // Without this an empty list would make every loop below pass.
    expect(AUTHORED_HELP_LOCALES.length).toBe(4);
    expect(HELP_GUIDES.length).toBe(4);
  });

  for (const language of AUTHORED_HELP_LOCALES) {
    for (const id of HELP_GUIDES) {
      it(`${id} in ${language} says something in every section`, () => {
        const { guide } = resolveHelpGuide(id, language);
        expect(guide.title.trim().length).toBeGreaterThan(5);
        expect(guide.audience.trim().length).toBeGreaterThan(10);
        expect(guide.sections.length).toBeGreaterThan(2);
        for (const section of guide.sections) {
          expect(section.heading.trim().length, `${id}/${language}: empty heading`).toBeGreaterThan(3);
          expect(section.body.length, `${id}/${language}: ${section.heading} has no text`).toBeGreaterThan(0);
          for (const paragraph of section.body) {
            // 30, not a prose quota. Short sentences are the point in a guide
            // read on a phone — "You can book people one by one or book a whole
            // team." is 52 characters and is exactly right. What this catches
            // is an empty string or a placeholder nobody replaced.
            expect(paragraph.trim().length, `${id}/${language}: empty paragraph`).toBeGreaterThan(30);
          }
        }
      });
    }
  }

  for (const id of HELP_GUIDES) {
    it(`${id} has the same sections in every language`, () => {
      // A translation that quietly dropped a section would still render as a
      // complete guide — and the section it dropped could be the one nobody
      // guesses without being told.
      const counts = AUTHORED_HELP_LOCALES.map((language) => ({
        language,
        sections: resolveHelpGuide(id, language).guide.sections.length,
      }));
      expect(counts.filter((entry) => entry.sections !== counts[0].sections), `${id} differs`).toEqual([]);
    });
  }
});

describe("the rules the manual exists to explain", () => {
  /** Every paragraph of one English guide, as one string. */
  function text(id: HelpGuideId): string {
    const { guide } = resolveHelpGuide(id, "en");
    return guide.sections.flatMap((section) => [section.heading, ...section.body]).join(" ");
  }

  const cases: { rule: string; guide: HelpGuideId; must: RegExp[] }[] = [
    { rule: "booking a team freezes its members", guide: "supervisor", must: [/freez/i, /timesheet/i] },
    { rule: "availability warns, it does not block", guide: "supervisor", must: [/warns/i, /does not block/i] },
    { rule: "the note on an absence is private", guide: "worker", must: [/not shown to colleagues/i] },
    { rule: "delegation is not collaboration", guide: "manager", must: [/delegat/i, /consent/i] },
    { rule: "the company invite is a credential", guide: "manager", must: [/credential/i] },
    { rule: "five levels, one visible", guide: "manager", must: [/five levels/i, /one level/i] },
    { rule: "article 30bis links out, it does not answer", guide: "manager", must: [/30bis/i, /does not answer/i] },
    { rule: "the colleague accepts before the supervisor", guide: "worker", must: [/accept/i, /still yours/i] },
    { rule: "position is used once and discarded", guide: "worker", must: [/thrown away/i, /does not keep/i] },
    { rule: "the calendar feed is not live", guide: "worker", must: [/not to the minute|never in the calendar/i] },
  ];

  for (const { rule, guide, must } of cases) {
    it(`explains: ${rule}`, () => {
      const body = text(guide);
      // The assertion that keeps the rest honest — an empty guide would satisfy
      // "does not contain" checks but not this one.
      expect(body.length, `${guide} is empty`).toBeGreaterThan(500);
      for (const pattern of must) {
        expect(pattern.test(body), `${guide} no longer explains ${rule}`).toBe(true);
      }
    });
  }
});

describe("which language a reader gets", () => {
  it("their own, when it was written", () => {
    for (const language of AUTHORED_HELP_LOCALES) {
      const resolution = resolveHelpGuide("worker", language);
      expect(resolution.language).toBe(language);
      expect(resolution.isFallback).toBe(false);
    }
  });

  it("Portuguese rather than English for a Brazilian reader", () => {
    // The whole reason the fallback is a map and not a constant. A Brazilian
    // reader given European Portuguese understands every word; given English
    // they may not.
    const resolution = resolveHelpGuide("worker", "pt-BR");
    expect(resolution.language).toBe("pt");
    expect(resolution.isFallback, "and is told, because it is not their variant").toBe(true);
  });

  it("English for the rest, and says so", () => {
    const others = locales.filter(
      (locale) => !(AUTHORED_HELP_LOCALES as readonly string[]).includes(locale) && locale !== "pt-BR",
    );
    // German, Spanish, Italian, Polish and Romanian. If this list were empty
    // the assertion below would prove nothing.
    expect(others.length).toBe(5);
    for (const locale of others) {
      const resolution = resolveHelpGuide("manager", locale);
      expect(resolution.language, `${locale}`).toBe("en");
      expect(resolution.isFallback).toBe(true);
    }
  });

  it("never leaves a locale without a guide", () => {
    for (const locale of locales) {
      for (const id of HELP_GUIDES) {
        expect(resolveHelpGuide(id, locale).guide.sections.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("which guide comes first", () => {
  it("the reader's own", () => {
    expect(guideOrderFor(["owner", "admin"])[0]).toBe("manager");
    expect(guideOrderFor(["supervisor"])[0]).toBe("supervisor");
    expect(guideOrderFor(["employee"])[0]).toBe("worker");
    expect(guideOrderFor([])[0]).toBe("worker");
  });

  it("and the other three are still there", () => {
    // Ordering, not filtering. A supervisor who wants to know what their crew
    // sees should be able to read the worker's guide.
    for (const roles of [["owner"], ["supervisor"], ["employee"]]) {
      expect([...guideOrderFor(roles)].sort()).toEqual([...HELP_GUIDES].sort());
    }
  });
});
