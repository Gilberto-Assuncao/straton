import { describe, expect, it } from "vitest";
import { normaliseWebsite } from "@/src/features/companies/validation";

/**
 * How people actually write a website.
 *
 * Reported as "site não aceito": `www.belnexenergy.be` typed into the company
 * form, rejected by the browser before it was even submitted because the field
 * was `type="url"`. The address was perfectly good.
 *
 * A missing scheme is not a mistake to correct somebody about — it is the
 * normal way a domain is written down.
 */
describe("normalising a website", () => {
  it("adds https to a bare domain", () => {
    expect(normaliseWebsite("www.belnexenergy.be")).toBe("https://www.belnexenergy.be");
  });

  it("adds https to a domain without www", () => {
    expect(normaliseWebsite("belnexenergy.be")).toBe("https://belnexenergy.be");
  });

  it("leaves an address that already has a scheme alone", () => {
    expect(normaliseWebsite("https://belnexenergy.be")).toBe("https://belnexenergy.be");
    expect(normaliseWebsite("http://belnexenergy.be")).toBe("http://belnexenergy.be");
  });

  it("does not touch an empty field, which is allowed", () => {
    expect(normaliseWebsite("")).toBe("");
    expect(normaliseWebsite("   ")).toBe("");
  });

  it("trims what was pasted", () => {
    expect(normaliseWebsite("  www.belnexenergy.be  ")).toBe("https://www.belnexenergy.be");
  });

  it("does not double up on an unusual scheme", () => {
    // Not something to encourage, but prefixing it would corrupt the value.
    expect(normaliseWebsite("ftp://files.example.be")).toBe("ftp://files.example.be");
  });
});
