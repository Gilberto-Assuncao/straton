import { describe, expect, it } from "vitest";
import { chainSide } from "@/src/features/partners/chain";
import type { RelationshipType } from "@/src/features/partners/data";

/**
 * One relationship row is read by two companies, and it has to mean opposite
 * things to each of them. Getting this backwards would put a contractor's own
 * subcontractor in the "who contracts you" band — a wrong answer that looks
 * entirely well-formed to the build, the types and the renderer alike.
 */
describe("which side of the chain the other company is on", () => {
  it("puts your client above you", () => {
    // The row reads "they are my client": they pay, so they are upstream.
    expect(chainSide("client", true)).toBe("upstream");
  });

  it("puts your subcontractor below you", () => {
    expect(chainSide("subcontractor", true)).toBe("downstream");
  });

  it("puts the company that hired you above you", () => {
    expect(chainSide("contractor", true)).toBe("upstream");
  });

  it("reads the same row the opposite way from the other end", () => {
    // The heart of it: A recorded "B is my subcontractor". A sees B below;
    // B must see A above.
    expect(chainSide("subcontractor", false)).toBe("upstream");
    expect(chainSide("client", false)).toBe("downstream");
    expect(chainSide("contractor", false)).toBe("downstream");
  });

  it("leaves a lateral partnership lateral from both ends", () => {
    expect(chainSide("partner", true)).toBe("lateral");
    expect(chainSide("partner", false)).toBe("lateral");
  });

  it("never returns the same side to both ends of a hierarchical row", () => {
    // A property rather than a case: whatever the mapping grows into, no
    // hierarchical relationship may ever place both companies above each other.
    const hierarchical: RelationshipType[] = ["client", "contractor", "subcontractor"];
    for (const type of hierarchical) {
      expect(chainSide(type, true)).not.toBe(chainSide(type, false));
    }
  });
});
