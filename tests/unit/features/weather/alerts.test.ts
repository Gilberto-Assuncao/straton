import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { evaluateAlert } from "@/src/features/weather/alerts";
import type { WeatherMessageKey } from "@/src/features/weather/messages";
import type { ForecastDay } from "@/src/infrastructure/weather/types";

function day(overrides: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date: "2026-07-22",
    temperatureMinC: 15,
    temperatureMaxC: 22,
    precipitationProbability: 10,
    precipitationMm: 0,
    windSpeedMaxKmh: 10,
    conditionCode: 0,
    ...overrides,
  };
}

describe("evaluateAlert", () => {
  it("returns none for calm, dry weather", () => {
    expect(evaluateAlert(day()).level).toBe("none");
  });

  it("returns watch at 40% precipitation probability", () => {
    expect(evaluateAlert(day({ precipitationProbability: 40 })).level).toBe("watch");
  });

  it("returns delay-risk at 70% precipitation probability", () => {
    expect(evaluateAlert(day({ precipitationProbability: 70 })).level).toBe("delay-risk");
  });

  it("returns watch at 35 km/h wind", () => {
    expect(evaluateAlert(day({ windSpeedMaxKmh: 35 })).level).toBe("watch");
  });

  it("returns delay-risk at 60 km/h wind", () => {
    expect(evaluateAlert(day({ windSpeedMaxKmh: 60 })).level).toBe("delay-risk");
  });

  it("prioritizes the wind reason over rain when both cross the delay-risk threshold", () => {
    const result = evaluateAlert(day({ precipitationProbability: 80, windSpeedMaxKmh: 65 }));
    expect(result.level).toBe("delay-risk");
    expect(result.reasonKey).toBe("reasonStrongWind");
  });

  /**
   * The other half of #14. `locale-parity.test.ts` proves every English key is
   * translated everywhere; nothing proved that a key the code *asks for*
   * exists in English at all. A key with no entry does not throw — next-intl
   * renders the raw path, so `weather.reasonHeavyRain` appears on screen and
   * the build stays green. That is exactly how `nav.agenda` reached users.
   *
   * Enumerating the union by hand would defeat the purpose, so the reasons are
   * read back out of the function across the whole input space.
   */
  it("only produces reason keys that exist in English", () => {
    const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as { weather: Record<string, string> };

    const produced = new Set(
      [0, 45, 75].flatMap((precipitationProbability) =>
        [0, 40, 65].map((windSpeedMaxKmh) => evaluateAlert(day({ precipitationProbability, windSpeedMaxKmh })).reasonKey),
      ),
    );

    // Every branch, not just the ones the grid happened to hit.
    expect(produced.size, "reasons the thresholds can produce").toBe(5);
    expect([...produced].filter((key) => !(key in messages.weather)), "reason keys missing from en.json").toEqual([]);
  });

  it("has an English entry for both failure messages", () => {
    const messages = JSON.parse(readFileSync("messages/en.json", "utf8")) as { weather: Record<string, string> };
    // These two are returned by `data.ts`, which needs a live Supabase client
    // to reach — so they are asserted against the union instead.
    const failures: WeatherMessageKey[] = ["errNoCoordinates", "errForecastUnavailable"];
    expect(failures.filter((key) => !(key in messages.weather)), "failure keys missing from en.json").toEqual([]);
  });
});
