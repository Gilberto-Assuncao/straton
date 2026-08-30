import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AUTHORED_LOCALES, LEGAL, LEGAL_KINDS, resolveLegalDocument } from "@/src/content/legal";
import { locales } from "@/src/i18n/routing";

/**
 * The legal pages: present, complete, and honest about their language.
 *
 * These documents are the one part of the product where an empty string is not
 * a cosmetic bug. A privacy notice with a missing section is a notice that does
 * not say what it must say, and nothing else in this repository would notice —
 * they are plain data, they always compile, and they always render.
 *
 * The second half is about the gap the design chose to leave: the platform
 * speaks ten languages and these documents are written in three. That is
 * defensible only while every other reader is told which version they are
 * getting, so the fallback is asserted rather than assumed.
 */
describe("the legal documents", () => {
  it("exist in every language they claim to be written in", () => {
    // The assertion that keeps the rest honest: an empty list of languages or
    // kinds would make every loop below pass without checking anything.
    expect(AUTHORED_LOCALES.length).toBeGreaterThan(1);
    expect(LEGAL_KINDS.length).toBe(3);
  });

  for (const language of AUTHORED_LOCALES) {
    for (const kind of LEGAL_KINDS) {
      it(`${kind} in ${language} says something in every section`, () => {
        const { document } = resolveLegalDocument(kind, language);
        expect(document.title.trim().length).toBeGreaterThan(3);
        expect(document.summary.trim().length).toBeGreaterThan(20);
        expect(document.sections.length).toBeGreaterThan(3);
        for (const section of document.sections) {
          expect(section.heading.trim().length, `${kind}/${language}: empty heading`).toBeGreaterThan(2);
          expect(section.body.length, `${kind}/${language}: ${section.heading} has no text`).toBeGreaterThan(0);
          for (const paragraph of section.body) {
            expect(paragraph.trim().length, `${kind}/${language}: short paragraph under ${section.heading}`).toBeGreaterThan(40);
          }
        }
      });
    }
  }

  for (const kind of LEGAL_KINDS) {
    it(`${kind} has the same sections in every language`, () => {
      // A translation that quietly dropped a section would still render, still
      // pass a type check, and still read as a complete document — and the
      // section it dropped could be the one about location.
      const counts = AUTHORED_LOCALES.map((language) => ({
        language,
        sections: resolveLegalDocument(kind, language).document.sections.length,
      }));
      const reference = counts[0].sections;
      expect(counts.filter((entry) => entry.sections !== reference), `${kind} sections differ`).toEqual([]);
    });
  }

  it("says what it does not collect, in every language", () => {
    // The single most consequential claim on the page, and the one a
    // translation is most likely to soften into nothing. Checked by the number
    // that only appears in that section: the ten-metre rounding.
    for (const language of AUTHORED_LOCALES) {
      const { document } = resolveLegalDocument("privacy", language);
      const text = document.sections.flatMap((section) => section.body).join(" ");
      expect(text, `privacy/${language} does not mention the rounding`).toMatch(/ten met|tien meter|dix mètres/i);
    }
  });

  it("carries a plausible date", () => {
    expect(LEGAL.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(new Date(LEGAL.updatedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe("which language a reader gets", () => {
  it("serves their own, when there is one", () => {
    for (const language of AUTHORED_LOCALES) {
      const resolution = resolveLegalDocument("privacy", language);
      expect(resolution.language).toBe(language);
      expect(resolution.isFallback, `${language} should not be a fallback`).toBe(false);
    }
  });

  it("serves the reference version to everybody else, and says so", () => {
    const others = locales.filter((locale) => !(AUTHORED_LOCALES as readonly string[]).includes(locale));
    // Seven of the ten. If this list were ever empty the assertion below would
    // pass while proving nothing.
    expect(others.length).toBeGreaterThan(4);
    for (const locale of others) {
      const resolution = resolveLegalDocument("terms", locale);
      expect(resolution.language, `${locale} should fall back`).toBe("en");
      expect(resolution.isFallback, `${locale} must be told it is reading English`).toBe(true);
    }
  });

  it("never leaves a locale without a document", () => {
    for (const locale of locales) {
      for (const kind of LEGAL_KINDS) {
        expect(resolveLegalDocument(kind, locale).document.sections.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the footer", () => {
  it("no longer sends the legal links nowhere", () => {
    // They were three `href="#"` for two months: a privacy link that goes
    // nowhere is worse than no link, because it reads as a policy that exists.
    const landing = readFileSync("app/[locale]/page.tsx", "utf8");
    for (const kind of LEGAL_KINDS) {
      expect(landing, `footer does not link /legal/${kind}`).toContain(`href="/legal/${kind}"`);
    }
  });

  it("has no link that goes nowhere at all", () => {
    // The rest of them: About us, Blog and Careers sat on `href="#"` beside the
    // legal ones. Two of the three had nothing to point at and were removed —
    // the same call as the three disabled menu entries — and About us now
    // points at the origin section. A page that teaches people its links do
    // nothing has taught them about the links that work too.
    //
    // Comments are stripped first: this file explains the decision in prose
    // that quotes the very string being forbidden.
    const landing = readFileSync("app/[locale]/page.tsx", "utf8")
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(landing.match(/href="#"/g) ?? [], "links parked on href=\"#\"").toEqual([]);
    // And the anchor it was given exists, because an anchor to nothing is the
    // same dead link with a longer name.
    expect(landing).toContain('href="#origem"');
    expect(landing).toContain('id="origem"');
  });
});
