import "server-only";

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

  // A street on its own is ambiguous almost everywhere; a postcode or a city
  // is what makes the match meaningful.
  if (!street && !postalCode && !city) return { found: false, reason: "incomplete_address" };
  if (!postalCode && !city) return { found: false, reason: "incomplete_address" };

  const params = new URLSearchParams({ format: "jsonv2", limit: "1", addressdetails: "0" });
  if (street) params.set("street", street);
  if (postalCode) params.set("postalcode", postalCode);
  if (city) params.set("city", city);
  params.set("countrycodes", (address.countryCode || "be").toLowerCase());

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
    return { found: false, reason: "unavailable" };
  }

  if (!response.ok) return { found: false, reason: "unavailable" };

  try {
    const hits = (await response.json()) as { lat: string; lon: string; display_name: string }[];
    const hit = hits[0];
    if (!hit) return { found: false, reason: "no_match" };

    const latitude = Number(hit.lat);
    const longitude = Number(hit.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return { found: false, reason: "no_match" };
    }

    // Six decimals is around 0.1 m — far beyond what a site pin needs, and it
    // keeps the value readable in the form.
    return {
      found: true,
      latitude: Number(latitude.toFixed(6)),
      longitude: Number(longitude.toFixed(6)),
      matchedAddress: hit.display_name,
    };
  } catch {
    return { found: false, reason: "unavailable" };
  }
}
