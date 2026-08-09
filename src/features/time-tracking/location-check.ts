/**
 * Was the clock-in made at the work location? (#31)
 *
 * The company's question is "did this shift start where the work is". It is not
 * "where is this person", and the two are only in tension if the position is
 * stored. So the position is used here, once, and thrown away; what the caller
 * keeps is the verdict.
 *
 * Kept out of the server-only module so it can be unit tested, the same split
 * as `worked-hours-format.ts` and `geocoding/address.ts`.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationCheck {
  /** True at the site, false away from it, null when it cannot be judged. */
  withinSite: boolean | null;
  /**
   * Distance in metres, rounded to 10.
   *
   * Coarse on purpose. A metre-accurate distance from a known point is the
   * position again, by arithmetic — the rounding is what keeps this a check
   * rather than a tracker.
   */
  distanceMetres: number | null;
}

/**
 * How far from the site still counts as "at the site".
 *
 * Generous, and deliberately so. Phone positioning is routinely off by tens of
 * metres between buildings, a large site can be a few hundred metres end to
 * end, and the cost of the two errors is not symmetric: a false "away" accuses
 * somebody of not being where they said, and they have no way to argue with it.
 * A false "at the site" costs a supervisor a question.
 */
export const SITE_RADIUS_METRES = 300;

const EARTH_RADIUS_METRES = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance. At these distances the earth's shape is not the error that matters. */
export function distanceBetween(a: Coordinates, b: Coordinates): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.sqrt(h));
}

/**
 * Judges a clock-in against the work location.
 *
 * Returns `null` for both when there is nothing to compare — the device refused
 * the position, or the location has no coordinates of its own yet. An unknown
 * answer is recorded as unknown rather than as a failure: a location nobody
 * geocoded is the company's gap, and the worker should not wear it.
 */
export function checkClockInLocation(
  reported: Coordinates | null | undefined,
  site: Partial<Coordinates> | null | undefined,
  radiusMetres: number = SITE_RADIUS_METRES,
): LocationCheck {
  if (!reported || !Number.isFinite(reported.latitude) || !Number.isFinite(reported.longitude)) {
    return { withinSite: null, distanceMetres: null };
  }
  if (
    !site ||
    typeof site.latitude !== "number" ||
    typeof site.longitude !== "number" ||
    !Number.isFinite(site.latitude) ||
    !Number.isFinite(site.longitude)
  ) {
    return { withinSite: null, distanceMetres: null };
  }

  const metres = distanceBetween(reported, { latitude: site.latitude, longitude: site.longitude });
  return {
    withinSite: metres <= radiusMetres,
    distanceMetres: Math.round(metres / 10) * 10,
  };
}
