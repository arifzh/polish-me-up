"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Loader2, MapPin, X } from "lucide-react";

import type { CartAddress } from "@/store/cartStore";

const KL_CENTER: [number, number] = [101.7123, 3.1488];
const DEFAULT_ZOOM = 12;
const GOOGLE_PLACES_AUTOCOMPLETE =
  "https://places.googleapis.com/v1/places:autocomplete";
const GOOGLE_PLACES_DETAILS = "https://places.googleapis.com/v1/places";
const GOOGLE_PLACES_NEARBY =
  "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json";

// Building-scale POI types - what a customer would name as "the place I'm at"
// (hotels, malls, hospitals, mosques, etc.), as opposed to individual shops
// inside a tower.
const BUILDING_TYPES = [
  "lodging",
  "hotel",
  "resort_hotel",
  "shopping_mall",
  "tourist_attraction",
  "university",
  "hospital",
  "stadium",
  "airport",
  "apartment_complex",
  "apartment_building",
  "condominium_complex",
  "housing_complex",
  "event_venue",
  "movie_theater",
  "mosque",
  "church",
  "hindu_temple",
  "buddhist_temple",
  "city_hall",
  "courthouse",
  "school",
];

type Suggestion = {
  placeId: string;
  text: string;
  secondary: string;
};

type GoogleComponents = {
  street_number?: string;
  route?: string;
  neighborhood?: string;
  sublocality_level_1?: string;
  sublocality_level_2?: string;
  administrative_area_level_2?: string;
  administrative_area_level_1?: string;
  locality?: string;
  postal_code?: string;
  country?: string;
};

type GeocoderResult = {
  formatted_address?: string;
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  geometry?: { location?: { lat: number; lng: number } };
};

function componentsToMap(
  components: GeocoderResult["address_components"],
): GoogleComponents {
  const out: GoogleComponents = {};
  for (const c of components ?? []) {
    for (const t of c.types) {
      if (t === "street_number") out.street_number = c.long_name;
      else if (t === "route") out.route = c.long_name;
      else if (t === "neighborhood") out.neighborhood = c.long_name;
      else if (t === "sublocality_level_1")
        out.sublocality_level_1 = c.long_name;
      else if (t === "sublocality_level_2")
        out.sublocality_level_2 = c.long_name;
      else if (t === "administrative_area_level_2")
        out.administrative_area_level_2 = c.long_name;
      else if (t === "administrative_area_level_1")
        out.administrative_area_level_1 = c.long_name;
      else if (t === "locality") out.locality = c.long_name;
      else if (t === "postal_code") out.postal_code = c.long_name;
      else if (t === "country") out.country = c.long_name;
    }
  }
  return out;
}

/**
 * Format Google address_components into the user's Malaysian 3-line layout:
 *   Line 1: street_number + route
 *   Line 2: neighborhood / sublocality_level_1 / sublocality_level_2 / administrative_area_level_2 (deduped)
 *   Line 3: postal_code + locality + administrative_area_level_1
 *
 * Lines are joined with `\n` - single-line inputs collapse it to a space,
 * while `whitespace-pre-line` panels render the stacked form.
 */
function formatMalaysianAddress(
  components: GeocoderResult["address_components"],
  formattedFallback?: string,
): string {
  const c = componentsToMap(components);

  const line1 = [c.street_number, c.route].filter(Boolean).join(" ");

  const line2 = [
    c.neighborhood,
    c.sublocality_level_1,
    c.sublocality_level_2,
    c.administrative_area_level_2,
  ]
    .filter((v): v is string => !!v)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");

  const cityRegion = [c.locality, c.administrative_area_level_1]
    .filter((v): v is string => !!v)
    .filter((v, i, arr) => arr.indexOf(v) === i)
    .join(", ");
  const line3 = [c.postal_code, cityRegion].filter(Boolean).join(" ");

  const formatted = [line1, line2, line3]
    .filter((v) => v && v.trim())
    .join("\n");

  return formatted || formattedFallback || "";
}

async function reverseGeocode(
  key: string,
  lat: number,
  lng: number,
): Promise<{
  formatted: string;
  components: GoogleComponents;
  raw: string;
} | null> {
  try {
    const url = `${GOOGLE_GEOCODE}?latlng=${lat},${lng}&key=${key}&language=en&region=my`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status: string;
      results?: GeocoderResult[];
    };
    if (data.status !== "OK" || !data.results || data.results.length === 0)
      return null;
    const top = data.results[0];
    const formatted = formatMalaysianAddress(
      top.address_components,
      top.formatted_address,
    );
    return {
      formatted,
      components: componentsToMap(top.address_components),
      raw: top.formatted_address ?? formatted,
    };
  } catch {
    return null;
  }
}

/**
 * Look up a named building / hotel / mall / POI within a small radius of
 * the pinned coords. Falls back gracefully if none is found.
 */
async function findNearbyBuilding(
  key: string,
  lat: number,
  lng: number,
): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_PLACES_NEARBY, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "places.displayName,places.types,places.location",
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 50,
          },
        },
        includedPrimaryTypes: BUILDING_TYPES,
        maxResultCount: 1,
        rankPreference: "DISTANCE",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      places?: Array<{
        displayName?: { text?: string };
        types?: string[];
        location?: { latitude?: number; longitude?: number };
      }>;
    };
    const name = data.places?.[0]?.displayName?.text?.trim();
    return name && name.length > 0 ? name : null;
  } catch {
    return null;
  }
}

async function fetchAutocomplete(
  key: string,
  input: string,
  bias: [number, number],
  sessionToken: string,
): Promise<Suggestion[]> {
  if (!input.trim()) return [];
  try {
    const res = await fetch(GOOGLE_PLACES_AUTOCOMPLETE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({
        input,
        includedRegionCodes: ["my"],
        languageCode: "en",
        sessionToken,
        locationBias: {
          circle: {
            center: { latitude: bias[1], longitude: bias[0] },
            radius: 50000.0,
          },
        },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      suggestions?: Array<{
        placePrediction?: {
          placeId?: string;
          text?: { text?: string };
          structuredFormat?: {
            mainText?: { text?: string };
            secondaryText?: { text?: string };
          };
        };
      }>;
    };
    return (data.suggestions ?? [])
      .map((s) => {
        const pp = s.placePrediction;
        if (!pp?.placeId) return null;
        const main =
          pp.structuredFormat?.mainText?.text ?? pp.text?.text ?? "";
        const sec = pp.structuredFormat?.secondaryText?.text ?? "";
        return {
          placeId: pp.placeId,
          text: main,
          secondary: sec,
        } satisfies Suggestion;
      })
      .filter((s): s is Suggestion => s !== null);
  } catch {
    return [];
  }
}

async function fetchPlaceDetails(
  key: string,
  placeId: string,
  sessionToken: string,
): Promise<{ lat: number; lng: number; formatted: string } | null> {
  try {
    const url = `${GOOGLE_PLACES_DETAILS}/${placeId}?sessionToken=${encodeURIComponent(
      sessionToken,
    )}`;
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask":
          "id,location,formattedAddress,addressComponents",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      location?: { latitude?: number; longitude?: number };
      formattedAddress?: string;
      addressComponents?: Array<{
        longText: string;
        shortText: string;
        types: string[];
      }>;
    };
    const lat = data.location?.latitude;
    const lng = data.location?.longitude;
    if (lat == null || lng == null) return null;
    // Reshape addressComponents (places v1) → address_components (geocoder shape)
    const reshaped = (data.addressComponents ?? []).map((c) => ({
      long_name: c.longText,
      short_name: c.shortText,
      types: c.types,
    }));
    const formatted = formatMalaysianAddress(
      reshaped,
      data.formattedAddress,
    );
    return { lat, lng, formatted };
  } catch {
    return null;
  }
}

function makeSessionToken(): string {
  // 32 hex chars - enough entropy for Places billing session grouping
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function AddressPicker({
  token: mapboxToken,
  value,
  onChange,
}: {
  /** Mapbox token (used only for the visual map tiles). */
  token: string;
  value: CartAddress | null;
  onChange: (address: CartAddress | null) => void;
}) {
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const lastAppliedRef = useRef<string>(
    value ? `${value.lng.toFixed(6)},${value.lat.toFixed(6)}` : "",
  );

  const [inputValue, setInputValue] = useState(value?.text ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [loadingPin, setLoadingPin] = useState(false);
  const sessionTokenRef = useRef<string>(makeSessionToken());
  const debounceRef = useRef<number | null>(null);

  // ─── Map init (Mapbox tiles + draggable rose marker) ─────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: value ? [value.lng, value.lat] : KL_CENTER,
      zoom: value ? 15 : DEFAULT_ZOOM,
      maxBounds: [
        [99.6, 0.85],
        [119.3, 7.4],
      ],
    });
    map.addControl(
      new mapboxgl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const marker = new mapboxgl.Marker({ color: "#EC4899", draggable: true });
    if (value) marker.setLngLat([value.lng, value.lat]).addTo(map);

    async function applyPin(lng: number, lat: number) {
      marker.setLngLat([lng, lat]).addTo(map);
      setLoadingPin(true);
      // Fetch the address and the nearby building name in parallel.
      const [result, buildingName] = googleKey
        ? await Promise.all([
            reverseGeocode(googleKey, lat, lng),
            findNearbyBuilding(googleKey, lat, lng),
          ])
        : [null, null];
      setLoadingPin(false);

      const baseLines = (result?.formatted ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // Prepend the building/hotel name as line 1 - unless the geocoder
      // already echoed it back inside the address (avoid duplicates).
      const lines: string[] = [];
      if (
        buildingName &&
        !baseLines.some(
          (l) => l.toLowerCase().includes(buildingName.toLowerCase()),
        )
      ) {
        lines.push(buildingName);
      }
      lines.push(...baseLines);

      const text =
        lines.length > 0
          ? lines.join("\n")
          : `Pinned location near ${lat.toFixed(5)}, ${lng.toFixed(5)}`;

      const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
      lastAppliedRef.current = key;
      setInputValue(text);
      setSuggestions([]);
      setShowDropdown(false);
      onChange({ text, lng, lat });
    }

    marker.on("dragend", () => {
      const { lng, lat } = marker.getLngLat();
      applyPin(lng, lat);
    });
    map.on("click", (e) => {
      applyPin(e.lngLat.lng, e.lngLat.lat);
    });
    map.getCanvas().style.cursor = "crosshair";

    mapRef.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxToken]);

  // ─── Sync to externally-controlled value (saved chip clicks, hydration) ──
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    if (!value) return;
    const key = `${value.lng.toFixed(6)},${value.lat.toFixed(6)}`;
    if (key === lastAppliedRef.current) return;
    lastAppliedRef.current = key;
    markerRef.current.setLngLat([value.lng, value.lat]).addTo(mapRef.current);
    mapRef.current.flyTo({ center: [value.lng, value.lat], zoom: 16 });
    setInputValue(value.text);
  }, [value]);

  // ─── Debounced autocomplete on typing ────────────────────────────
  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setInputValue(v);

    if (debounceRef.current != null) window.clearTimeout(debounceRef.current);

    if (!googleKey) return;
    if (!v.trim()) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      setLoadingSuggest(true);
      const bias: [number, number] = value
        ? [value.lng, value.lat]
        : KL_CENTER;
      const list = await fetchAutocomplete(
        googleKey,
        v,
        bias,
        sessionTokenRef.current,
      );
      setLoadingSuggest(false);
      setSuggestions(list);
      setShowDropdown(list.length > 0);
    }, 200);
  }

  async function pickSuggestion(s: Suggestion) {
    if (!googleKey) return;
    setShowDropdown(false);
    setInputValue(`${s.text} - loading…`);
    const details = await fetchPlaceDetails(
      googleKey,
      s.placeId,
      sessionTokenRef.current,
    );
    // Rotate session token after a successful pick (Google's billing convention).
    sessionTokenRef.current = makeSessionToken();

    if (!details) {
      setInputValue(value?.text ?? "");
      return;
    }

    const { lat, lng, formatted } = details;
    const text = formatted || `${s.text}, ${s.secondary}`;
    const key = `${lng.toFixed(6)},${lat.toFixed(6)}`;
    lastAppliedRef.current = key;
    setInputValue(text);

    if (mapRef.current && markerRef.current) {
      markerRef.current.setLngLat([lng, lat]).addTo(mapRef.current);
      mapRef.current.flyTo({ center: [lng, lat], zoom: 16 });
    }
    onChange({ text, lng, lat });
  }

  // Close dropdown on outside click
  const wrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setShowDropdown(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const helperLines = useMemo(
    () => (value?.text ?? "").split("\n").filter(Boolean),
    [value?.text],
  );

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-[#3D1A2A]">
        Service address
      </label>

      {!googleKey ? (
        <div className="rounded-2xl border border-dashed border-[#F8BBD0] bg-white p-3 text-sm text-[#3D1A2A]/70">
          Set{" "}
          <code className="rounded bg-[#FFF5F8] px-1">
            NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          </code>{" "}
          in <code className="rounded bg-[#FFF5F8] px-1">.env</code> and
          restart the dev server.
        </div>
      ) : (
        <div ref={wrapRef} className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-[#F8BBD0] bg-white px-3 py-2 text-sm focus-within:border-[#EC4899] focus-within:ring-2 focus-within:ring-[#F8BBD0]">
            <MapPin className="size-4 shrink-0 text-[#EC4899]" />
            <input
              type="text"
              value={inputValue}
              onChange={onInputChange}
              onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              placeholder="House no., street, area - start typing…"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent text-[#3D1A2A] placeholder:text-[#3D1A2A]/40 focus:outline-none"
            />
            {loadingSuggest && (
              <Loader2 className="size-4 shrink-0 animate-spin text-[#EC4899]/70" />
            )}
            {!loadingSuggest && inputValue && (
              <button
                type="button"
                onClick={() => {
                  setInputValue("");
                  setSuggestions([]);
                  setShowDropdown(false);
                  onChange(null);
                }}
                aria-label="Clear address"
                className="text-[#3D1A2A]/40 hover:text-[#BE185D]"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {showDropdown && suggestions.length > 0 && (
            <ul className="absolute top-full right-0 left-0 z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border border-[#F8BBD0] bg-white shadow-lg">
              {suggestions.map((s) => (
                <li key={s.placeId}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickSuggestion(s)}
                    className="flex w-full flex-col items-start gap-0.5 border-b border-[#F8BBD0]/40 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-[#FFE4EC]/60"
                  >
                    <span className="font-medium text-[#3D1A2A]">
                      {s.text}
                    </span>
                    {s.secondary && (
                      <span className="text-xs text-[#5C2D48]/70">
                        {s.secondary}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="inline-flex items-center gap-1.5 text-xs text-[#3D1A2A]/60">
        <MapPin className="size-3.5" />
        Click anywhere on the map to drop the pin, or drag it to fine-tune.
      </p>

      <div
        ref={mapContainerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-[#F8BBD0] sm:h-72"
      />

      {value && helperLines.length > 0 ? (
        <div className="flex items-start gap-2 rounded-xl border border-[#F8BBD0] bg-[#FFE4EC]/70 px-3 py-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-[#EC4899]" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#BE185D]">
              Selected location
            </p>
            <div className="space-y-0.5 text-[#3D1A2A]">
              {helperLines.map((line, i) => (
                <p key={i} className="break-words">
                  {line}
                </p>
              ))}
            </div>
            {loadingPin && (
              <p className="mt-1 inline-flex items-center gap-1.5 text-[11px] text-[#5C2D48]/70">
                <Loader2 className="size-3 animate-spin" />
                Refreshing address…
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="inline-flex items-center gap-1.5 text-xs text-[#3D1A2A]/60">
          <Loader2 className="size-3.5 animate-spin" />
          Type an address or tap the map to drop a pin.
        </p>
      )}
    </div>
  );
}
