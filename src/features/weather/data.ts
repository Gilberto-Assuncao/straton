import "server-only";

import { createClient } from "@/src/infrastructure/supabase/server";
import { requireActiveCompany } from "@/src/application/session/server";
import { openMeteoProvider } from "@/src/infrastructure/weather/open-meteo";
import { evaluateAlert, type WeatherAlert } from "./alerts";
import type { WeatherMessageKey } from "./messages";
import type { ForecastDay } from "@/src/infrastructure/weather/types";

export type SiteWeather = {
  id: string;
  name: string;
  city: string | null;
  forecast: (ForecastDay & { alert: WeatherAlert })[] | null;
  /**
   * A key into the `weather` namespace, not a sentence (#14). This function
   * answers the same thing for every viewer; only the render knows the locale.
   */
  error: WeatherMessageKey | null;
};

interface SiteRow { id: string; name: string; latitude: number | null; longitude: number | null; address: { city?: string } | null }

const FORECAST_DAYS = 7;

export async function getSiteWeatherOverview(): Promise<SiteWeather[]> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("sites")
    .select("id,name,latitude,longitude,address")
    .eq("company_id", companyId)
    .order("name");
  if (error) throw new Error("Unable to load sites.");

  const sites = (rows ?? []) as SiteRow[];

  return Promise.all(sites.map(async (site): Promise<SiteWeather> => {
    const city = site.address?.city ?? null;
    if (site.latitude == null || site.longitude == null) {
      return { id: site.id, name: site.name, city, forecast: null, error: "errNoCoordinates" };
    }
    try {
      const days = await openMeteoProvider.fetchForecast(site.latitude, site.longitude, FORECAST_DAYS);
      return { id: site.id, name: site.name, city, forecast: days.map((day) => ({ ...day, alert: evaluateAlert(day) })), error: null };
    } catch {
      return { id: site.id, name: site.name, city, forecast: null, error: "errForecastUnavailable" };
    }
  }));
}

// Single-site variant for the site dashboard (#30). Kept beside the overview
// rather than filtering its result, so one site's forecast never waits on
// every other site's request.
export async function getSiteWeather(siteId: string): Promise<SiteWeather | null> {
  const { companyId } = await requireActiveCompany();
  const supabase = await createClient();

  const { data } = await supabase
    .from("sites")
    .select("id,name,latitude,longitude,address")
    .eq("company_id", companyId)
    .eq("id", siteId)
    .maybeSingle();
  if (!data) return null;

  const site = data as SiteRow;
  const city = site.address?.city ?? null;
  if (site.latitude == null || site.longitude == null) {
    return { id: site.id, name: site.name, city, forecast: null, error: "errNoCoordinates" };
  }
  try {
    const days = await openMeteoProvider.fetchForecast(site.latitude, site.longitude, FORECAST_DAYS);
    return { id: site.id, name: site.name, city, forecast: days.map((day) => ({ ...day, alert: evaluateAlert(day) })), error: null };
  } catch {
    return { id: site.id, name: site.name, city, forecast: null, error: "errForecastUnavailable" };
  }
}
