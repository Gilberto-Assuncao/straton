/**
 * What the weather feature can say, as keys into the `weather` namespace (#14).
 *
 * The data layer used to return finished English sentences — "No coordinates
 * set for this site yet." — which then rendered untouched to somebody reading
 * the product in Polish. The sentence cannot be written where it is produced:
 * `getSiteWeatherOverview` runs before anything knows who is looking, and its
 * result is the same for every viewer.
 *
 * So it returns a key and the text is resolved at render. Typed, deliberately:
 * these unions are what makes a wrong key a compile error instead of a screen
 * showing `weather.errNoCordinates` in production. That is the same failure
 * `locale-parity.test.ts` exists to catch on the other side — a key with no
 * translation — and this is the half a test cannot see, because a typo in the
 * caller is invisible to a file comparison.
 *
 * Kept out of `data.ts` on purpose: that module is `server-only`, and these
 * types have to be nameable from anywhere the strings are rendered.
 */

/** Why there is no forecast to show. */
export type WeatherMessageKey = "errNoCoordinates" | "errForecastUnavailable";

/** Why a day was flagged. One per branch of `evaluateAlert`. */
export type AlertReasonKey =
  | "reasonStrongWind"
  | "reasonHeavyRain"
  | "reasonModerateWind"
  | "reasonRainLikely"
  | "reasonNoRisk";
