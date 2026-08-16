import type { ForecastDay } from "@/src/infrastructure/weather/types";
import type { AlertReasonKey } from "./messages";

export type AlertLevel = "none" | "watch" | "delay-risk";
// The reason is a key, not a sentence: this runs on the server with no idea
// who will read the answer (#14).
export type WeatherAlert = { level: AlertLevel; reasonKey: AlertReasonKey };

// Thresholds are a starting point, not a tuned model — heavy rain or strong
// wind are the two conditions most likely to block outdoor electrical/HVAC
// site work, per the scenario registered in FUTURE_IDEAS.md (a snowstorm
// blocking a scheduled Site). Snow itself isn't separately modelled yet:
// Open-Meteo's weathercode does distinguish it, but scoring specific codes
// is left for a follow-up once real usage shows which thresholds matter.
export function evaluateAlert(day: ForecastDay): WeatherAlert {
  if (day.precipitationProbability >= 70 || day.windSpeedMaxKmh >= 60) {
    return { level: "delay-risk", reasonKey: day.windSpeedMaxKmh >= 60 ? "reasonStrongWind" : "reasonHeavyRain" };
  }
  if (day.precipitationProbability >= 40 || day.windSpeedMaxKmh >= 35) {
    return { level: "watch", reasonKey: day.windSpeedMaxKmh >= 35 ? "reasonModerateWind" : "reasonRainLikely" };
  }
  return { level: "none", reasonKey: "reasonNoRisk" };
}
