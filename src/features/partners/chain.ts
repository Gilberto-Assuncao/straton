import type { RelationshipType } from "./data";

/**
 * Where the other company sits relative to yours in the contracting chain.
 *
 * `relationship_type` describes the *target* of the row: a row (A, B, 'client')
 * reads "B is A's client". The same row therefore means opposite things
 * depending on which end you are standing at.
 */
export type ChainSide = "upstream" | "downstream" | "lateral";

/** From the source company's point of view. Inverted when you are the target. */
const sideFromSource: Record<RelationshipType, ChainSide> = {
  // "B is A's client" — B pays A, so from A the client is upstream.
  client: "upstream",
  contractor: "upstream",
  subcontractor: "downstream",
  partner: "lateral",
};

/**
 * Kept in its own module, free of `server-only`, so it can be unit tested.
 *
 * An inverted chain would tell a contractor they work *for* their own
 * subcontractor — and nothing in a build, a type check or a render would
 * notice, because both answers are valid strings in the right shape.
 */
export function chainSide(type: RelationshipType, iAmSource: boolean): ChainSide {
  const side = sideFromSource[type] ?? "lateral";
  if (iAmSource || side === "lateral") return side;
  return side === "upstream" ? "downstream" : "upstream";
}
