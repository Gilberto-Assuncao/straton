import { describe, expect, it } from "vitest";
import { formatEnterpriseNumber, retentionCheckUrl } from "@/src/features/companies/retention-check";

describe("formatEnterpriseNumber", () => {
  it("formats ten plain digits the way the portal expects", () => {
    expect(formatEnterpriseNumber("1038194067")).toBe("1038.194.067");
  });

  it("accepts a VAT number and drops the country prefix", () => {
    expect(formatEnterpriseNumber("BE0824054194")).toBe("0824.054.194");
  });

  it("leaves an already dotted number unchanged", () => {
    expect(formatEnterpriseNumber("0824.054.194")).toBe("0824.054.194");
  });

  // Older enterprise numbers are published without the leading zero, and that
  // is how people type them.
  it("pads a nine-digit number", () => {
    expect(formatEnterpriseNumber("824054194")).toBe("0824.054.194");
  });

  it("rejects anything that is not a plausible enterprise number", () => {
    expect(formatEnterpriseNumber("123")).toBeNull();
    expect(formatEnterpriseNumber("12345678901")).toBeNull();
    expect(formatEnterpriseNumber("")).toBeNull();
  });
});

describe("retentionCheckUrl", () => {
  it("deep-links into the official portal", () => {
    expect(retentionCheckUrl("BE1038194067")).toBe(
      "https://www.checkobligationderetenue.be/result/1038.194.067",
    );
  });

  // Returning null lets the caller hide the action rather than offer a link
  // that lands on an error page.
  it("returns null when there is no usable number", () => {
    expect(retentionCheckUrl(null)).toBeNull();
    expect(retentionCheckUrl(undefined)).toBeNull();
    expect(retentionCheckUrl("nope")).toBeNull();
  });
});
