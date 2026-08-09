import "server-only";

import { withoutBoxNumber } from "./address";

// Nominatim (OpenStreetMap) — free, no API key, EU-hosted, and the same data
// the weather forecast is ultimately keyed against.
//
// Chosen over a commercial geocoder because the volume here is tiny: a site is
// geocoded once when it is created, not on every page view. The published
// usage policy asks for at most one request per second and an identifying
// User-Agent, both of which this respects.
//
// The alternative — asking people to type latitude and longitude by hand — is
// what #31 exists to remove. Nobody knows the coordinates of a roof.

const ENDPOINT = "https://nominatim.openstreetmap.org/search";

export type GeocodeResult =
  | { found: true; latitude: number; longitude: number; matchedAddress: string }
  | { found: false; reason: "no_match" | "unavailable" | "incomplete_address" };

export interface AddressInput {
  street?: string;
  postalCode?: string;
  city?: string;
  countryCode?: string;
}

export async function geocodeAddress(address: AddressInput): Promise<GeocodeResult> {
  const street = address.street?.trim() ?? "";
  const postalCode = address.postalCode?.trim() ?? "";
  const city = address.city?.trim() ?? "";

  // Only a completely empty address is incomplete.
  //
  // This used to require a postcode or a city on top of the street, and that
  // refused the most common way the form is actually filled: the whole address
  // typed on one line, "Coppendries 3, bus 002, 1852, Beigem", with the other
  // two boxes left alone. The free-form attempt below handles exactly that, and
  // a wasted lookup costs less than telling somebody their address is
  // incomplete when they can see that it is not.
  if (!street && !postalCode && !city) return { found: false, reason: "incomplete_address" };

  const countryCode = (address.countryCode || "be").toLowerCase();

  /*
   * Two attempts, and the second is the one that saves most real addresses.
   *
   * Nominatim's structured query wants `street` to be a street *name*, and it
   * returns nothing the moment a house number is attached — in either order:
   *
   *   street="Rue de la Loi"      + city=Bruxelles  -> found
   *   street="Rue de la Loi 16"   + city=Bruxelles  -> nothing
   *   street="16 Rue de la Loi"   + city=Bruxelles  -> nothing
   *
   * Belgians write the number after the street, so the normal way to fill this
   * form produced "address not found" and the pin was never set. Reported as
   * "localização não funciona", and rightly.
   *
   * The free-form query handles a written-out address, so it runs as a fallback
   * when the structured one finds nothing. It can land on the street or the
   * postcode rather than the exact building, which is fine for what the pin is
   * for: a weather forecast and a marker on the operations map.
   */
  const structured = new URLSearchParams({ format: "jsonv2", limit: "1", addressdetails: "0", countrycodes: countryCode });
  if (street) structured.set("street", street);
  if (postalCode) structured.set("postalcode", postalCode);
  if (city) structured.set("city", city);

  const freeForm = new URLSearchParams({
    format: "jsonv2",
    limit: "1",
    addressdetails: "0",
    countrycodes: countryCode,
    q: withoutBoxNumber([street, postalCode, city].filter(Boolean).join(", ")),
  });

  for (const params of [structured, freeForm]) {
    const hit = await lookup(params);
    if (hit === "unavailable") return { found: false, reason: "unavailable" };
    if (hit) {
      return {
        found: true,
        // Six decimals is around 0.1 m — far beyond what a site pin needs, and
        // it keeps the value readable in the form.
        latitude: Number(hit.latitude.toFixed(6)),
        longitude: Number(hit.longitude.toFixed(6)),
        matchedAddress: hit.displayName,
      };
    }
  }

  return { found: false, reason: "no_match" };
}

type Hit = { latitude: number; longitude: number; displayName: string };

/** One call. `null` means no match; `"unavailable"` means we could not ask. */
async function lookup(params: URLSearchParams): Promise<Hit | null | "unavailable"> {
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params}`, {
      headers: {
        // Nominatim's usage policy requires identifying the application.
        "User-Agent": "STRATON/1.0 (https://straton.be)",
        Accept: "application/json",
      },
      // The same address always resolves to the same point, so caching for a
      // week costs nothing and keeps us well inside the rate limit.
      next: { revalidate: 604800 },
    });
  } catch {
    return "unavailable";
  }

  if (!response.ok) return "unavailable";

  try {
    const hits = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0];
    if (!hit) return null;

    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

    return { latitude, longitude, displayName: hit.display_name };
  } catch {
    return "unavailable";
  }
}
