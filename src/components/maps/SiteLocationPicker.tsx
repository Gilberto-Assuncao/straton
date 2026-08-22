"use client";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import "./leaflet-theme.css";
import type { Map as LeafletMap, Marker } from "leaflet";

/**
 * Correcting a site's position without ever showing a coordinate (#120).
 *
 * The `SiteForm` geocodes the address and hides the result, for a reason worth
 * repeating: "nobody knows the latitude of a roof, and a pair of decimals on
 * screen is a number a site manager cannot check, cannot correct and cannot act
 * on". That decision was right and incomplete — hiding the decimals solved
 * "cannot use", and left "cannot correct" with no answer at all.
 *
 * A pin the manager drags is the answer that keeps the rule: they aim at a
 * roof, and never read a number.
 */
export interface SiteLocationPickerProps {
  latitude: number;
  longitude: number;
  /** Where the geocoder put it, to undo a bad drag. Absent if never geocoded. */
  geocoded?: { latitude: number; longitude: number };
  onChange: (latitude: number, longitude: number) => void;
}

/**
 * The tile source, from configuration rather than code (#54).
 *
 * Every tile requested tells the provider where a customer's sites are, which
 * is why the provider is a decision and not a default. Keeping it here means
 * changing it is one environment variable, not a rewrite — and it is also what
 * lets this component ship before the account exists: with no URL set, the map
 * still pans, zooms and drags, over the same grid the placeholder always had.
 */
const TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL;
const TILE_ATTRIBUTION = process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ?? "";

export default function SiteLocationPicker({ latitude, longitude, geocoded, onChange }: SiteLocationPickerProps) {
  const t = useTranslations("sites");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  /*
   * The current `onChange`, without it being a dependency of the effect below.
   * Listed as one, a new closure on every render would tear down and rebuild
   * the map — losing the reader's pan and zoom on each keystroke elsewhere in
   * the form. Assigned in an effect rather than during render, which the React
   * Compiler rejects, and rightly: a ref written while rendering is a value the
   * renderer cannot account for.
   */
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!container.current || map.current) return;
    let cancelled = false;

    /*
     * Leaflet touches `window` at import time, so it cannot be bundled into the
     * server pass. The dynamic import keeps it out; `cancelled` covers the
     * unmount that happens before it resolves.
     */
    import("leaflet").then((L) => {
      if (cancelled || !container.current) return;

      const instance = L.map(container.current, { attributionControl: Boolean(TILE_ATTRIBUTION) })
        .setView([latitude, longitude], 18);

      if (TILE_URL) {
        L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 20 }).addTo(instance);
      }

      /*
       * Our own marker, not Leaflet's. The default icon is a PNG resolved from
       * the stylesheet's own path, which a bundler rewrites and then fails to
       * find — and this way the pin is a token, so it follows the theme.
       */
      const icon = L.divIcon({
        className: "",
        html: '<span class="block h-6 w-6 -translate-x-1/2 -translate-y-full rounded-full border-2 border-on-brand bg-brand shadow-lg"></span>',
        iconSize: [24, 24],
      });

      const pin = L.marker([latitude, longitude], { icon, draggable: true, keyboard: true }).addTo(instance);
      pin.on("dragend", () => {
        const { lat, lng } = pin.getLatLng();
        latest.current(lat, lng);
      });

      map.current = instance;
      marker.current = pin;
    });

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
    // Built once. Later coordinate changes move the marker below rather than
    // rebuilding the map, which would throw away the reader's pan and zoom.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Keeps the pin under a value that changed elsewhere — a re-geocode, or the
     reset button. Guarded, or every drag would fight the marker back. */
  useEffect(() => {
    const pin = marker.current;
    if (!pin) return;
    const current = pin.getLatLng();
    if (Math.abs(current.lat - latitude) < 1e-9 && Math.abs(current.lng - longitude) < 1e-9) return;
    pin.setLatLng([latitude, longitude]);
    map.current?.panTo([latitude, longitude]);
  }, [latitude, longitude]);

  const moved =
    geocoded !== undefined &&
    (Math.abs(geocoded.latitude - latitude) > 1e-9 || Math.abs(geocoded.longitude - longitude) > 1e-9);

  return (
    <div>
      <div
        ref={container}
        role="application"
        aria-label={t("markerMapLabel")}
        className="h-64 w-full overflow-hidden rounded-xl border border-edge-10 bg-surface-deep"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs leading-5 text-ink-subtle">{t("markerHelp")}</p>
        {/* Only once there is something to undo. */}
        {moved ? (
          <button
            type="button"
            onClick={() => onChange(geocoded.latitude, geocoded.longitude)}
            className="min-h-11 rounded-lg border border-edge-15 px-3 text-xs font-semibold text-ink transition hover:bg-edge-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {t("markerReset")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
