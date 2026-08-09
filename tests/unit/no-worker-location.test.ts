import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * We do not record where workers physically are (#61).
 *
 * The decision was made once, in conversation: address and chantier, never
 * coordinates. The code then drifted for weeks — `navigator.geolocation` on
 * clock-in, `start_latitude` / `start_longitude` on every entry — and nothing
 * objected, because a rule written in prose cannot defend itself.
 *
 * This is the rule as a test. It is deliberately a sweep and not a list, so it
 * also covers the screen nobody has written yet.
 *
 * What it does *not* forbid: site coordinates. A chantier's position is the
 * company's own record of one of its places, entered alongside the address, and
 * it is what the live map draws. The distinction this file exists to hold is
 * between a place a company works and a person it employs.
 */
function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : walk(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const sources = ["app", "components", "src", "lib"].flatMap(walk);

describe("worker location", () => {
  it("finds the files it claims to scan", () => {
    // A glob that quietly matched nothing would make everything below pass.
    expect(sources.length).toBeGreaterThan(100);
  });

  it("never asks the browser for a position", () => {
    // `getCurrentPosition` and `watchPosition` are the only two ways in, so
    // matching the namespace covers both and anything added beside them.
    const offenders = sources.filter((file) => /navigator\s*\.\s*geolocation/.test(readFileSync(file, "utf8")));
    expect(offenders, "files asking the browser for the user's position").toEqual([]);
  });

  it("never reads or writes a per-entry coordinate", () => {
    // The exact columns that were dropped. Naming them keeps the failure
    // legible: a reintroduction says which file, not "something matched".
    const offenders = sources.filter((file) => /start_latitude|start_longitude/.test(readFileSync(file, "utf8")));
    expect(offenders, "files touching a worker's recorded coordinates").toEqual([]);
  });

  it("no longer carries a location consent switch", () => {
    // The toggle governed exactly one behaviour, and that behaviour is gone.
    // A switch labelled "share my location" that changes nothing is a lie
    // about what the product does.
    const offenders = sources.filter((file) => /location_consent/.test(readFileSync(file, "utf8")));
    expect(offenders, "files referring to the removed location consent").toEqual([]);
  });
});
