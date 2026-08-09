import { describe, expect, it } from "vitest";
import { checkClockInLocation, distanceBetween, SITE_RADIUS_METRES } from "@/src/features/time-tracking/location-check";

/**
 * The clock-in location check (#31).
 *
 * The company's question is "did this shift start where the work is". It is not
 * "where is this person". Those only conflict if the position is stored, so it
 * is used once and discarded — these cases pin the judgement, and the rounding
 * that keeps it a check rather than a tracker.
 */
const BEIGEM = { latitude: 50.9599099, longitude: 4.3598260 };

describe("judging a clock-in against the work location", () => {
  it("counts a clock-in at the location", () => {
    expect(checkClockInLocation(BEIGEM, BEIGEM).withinSite).toBe(true);
  });

  it("counts one a couple of streets away", () => {
    // ~150 m north. Phone positioning is routinely off by this much between
    // buildings, and a large site is a few hundred metres end to end.
    const nearby = { latitude: BEIGEM.latitude + 0.00135, longitude: BEIGEM.longitude };
    expect(distanceBetween(BEIGEM, nearby)).toBeLessThan(SITE_RADIUS_METRES);
    expect(checkClockInLocation(nearby, BEIGEM).withinSite).toBe(true);
  });

  it("does not count one from the next town", () => {
    const brussels = { latitude: 50.8467372, longitude: 4.3524930 };
    expect(checkClockInLocation(brussels, BEIGEM).withinSite).toBe(false);
  });

  it("rounds the distance to ten metres", () => {
    // Not cosmetic. A metre-accurate distance from a known point is the
    // position again, by arithmetic.
    const away = { latitude: BEIGEM.latitude + 0.01, longitude: BEIGEM.longitude };
    const { distanceMetres } = checkClockInLocation(away, BEIGEM);
    expect(distanceMetres).not.toBeNull();
    expect(distanceMetres! % 10).toBe(0);
  });

  it("says unknown when the device would not give a position", () => {
    // Recorded as unknown, never as "away": a refused permission is not
    // evidence that somebody was somewhere else.
    expect(checkClockInLocation(null, BEIGEM)).toEqual({ withinSite: null, distanceMetres: null });
  });

  it("says unknown when the location has no coordinates of its own", () => {
    // A location nobody geocoded is the company's gap. The worker should not
    // wear it as a failed check.
    expect(checkClockInLocation(BEIGEM, null)).toEqual({ withinSite: null, distanceMetres: null });
    expect(checkClockInLocation(BEIGEM, { latitude: 50.9, longitude: undefined })).toEqual({
      withinSite: null,
      distanceMetres: null,
    });
  });

  it("says unknown rather than trusting nonsense from the device", () => {
    expect(checkClockInLocation({ latitude: Number.NaN, longitude: 4.3 }, BEIGEM).withinSite).toBeNull();
  });

  it("measures a known distance about right", () => {
    // Beigem to central Brussels is roughly 13 km.
    const brussels = { latitude: 50.8467372, longitude: 4.3524930 };
    const km = distanceBetween(BEIGEM, brussels) / 1000;
    expect(km).toBeGreaterThan(11);
    expect(km).toBeLessThan(15);
  });
});
