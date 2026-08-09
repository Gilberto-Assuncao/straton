import { describe, expect, it } from "vitest";
import { withoutBoxNumber } from "@/src/infrastructure/geocoding/address";

/**
 * The Belgian box number, and the trap in removing it (#31).
 *
 * Reported as "localização não funciona": the address was filled in correctly —
 * "Coppendries 3, bus 002", Beigem, 1852 — and the geocoder found nothing. The
 * box number is why. Belgian flats and offices are written this way as a matter
 * of course, so this is not an edge case.
 *
 * The first version of the rule allowed a bare "b" as the keyword, which ate
 * the town: ", Beigem" matched as "b" + "eigem". These cases exist so it cannot
 * come back.
 */
describe("stripping the box number", () => {
  it("removes a Dutch bus number", () => {
    expect(withoutBoxNumber("Coppendries 3, bus 002, 1852, Beigem")).toBe("Coppendries 3, 1852, Beigem");
  });

  it("removes a French bte", () => {
    expect(withoutBoxNumber("Rue de la Loi 16 bte 4, 1000 Bruxelles")).toBe("Rue de la Loi 16, 1000 Bruxelles");
  });

  it("removes a spelled-out boîte, accent and all", () => {
    expect(withoutBoxNumber("Avenue Louise 143 boîte 2, 1050 Bruxelles")).toBe("Avenue Louise 143, 1050 Bruxelles");
  });

  it("leaves an address without one untouched", () => {
    expect(withoutBoxNumber("Coppendries 3, 1852, Beigem")).toBe("Coppendries 3, 1852, Beigem");
  });

  it("does not eat a town that begins with b", () => {
    // The bug in the first attempt. Beigem is a real town and this address is
    // the one from the report.
    expect(withoutBoxNumber("Coppendries 3, bus 002, 1852, Beigem")).toContain("Beigem");
  });

  it("does not eat a street that begins with bus", () => {
    expect(withoutBoxNumber("Halte, Bushalte 12, 9000 Gent")).toBe("Halte, Bushalte 12, 9000 Gent");
    expect(withoutBoxNumber("Kerk, Busleydenstraat 5, 2800 Mechelen")).toBe("Kerk, Busleydenstraat 5, 2800 Mechelen");
  });
});
