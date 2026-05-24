"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { shortenDisplayName } from "@/lib/geocoding/nominatim";
import { cn } from "@/lib/utils";

export type CampaignLocationValue = {
  /** Stored in campaigns.city — human-readable search area. */
  label: string;
  lat: number;
  lon: number;
  boundingbox: [number, number, number, number];
};

type Suggestion = CampaignLocationValue & { place_id: number };

const DEFAULT_CENTER = { lat: 39.8283, lon: -98.5795 };
const DEFAULT_ZOOM = 4;

type LocationMapPickerProps = {
  value: CampaignLocationValue | null;
  onChange: (value: CampaignLocationValue | null) => void;
  disabled?: boolean;
};

export function LocationMapPicker({ value, onChange, disabled }: LocationMapPickerProps) {
  const mapId = useId().replace(/:/g, "");
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const markerRef = useRef<import("leaflet").Marker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);

  const [query, setQuery] = useState(value?.label ?? "");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [open, setOpen] = useState(false);
  const skipSearchRef = useRef(false);
  const selectPlaceRef = useRef<(place: Suggestion) => void>(() => {});

  const fitPlace = useCallback((loc: CampaignLocationValue) => {
    const map = mapInstance.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    const [south, north, west, east] = loc.boundingbox;
    const bounds = L.latLngBounds([south, west], [north, east]);

    if (markerRef.current) {
      markerRef.current.setLatLng([loc.lat, loc.lon]);
    } else {
      markerRef.current = L.marker([loc.lat, loc.lon], { draggable: !disabled }).addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current?.getLatLng();
        if (!pos) return;
        void (async () => {
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${pos.lat}&lon=${pos.lng}`);
            const data = (await res.json()) as { place?: Suggestion };
            if (data.place) selectPlaceRef.current(data.place);
          } catch {
            /* ignore */
          }
        })();
      });
    }

    if (bounds.isValid() && north - south > 0.02) {
      map.fitBounds(bounds.pad(0.08), { maxZoom: 12 });
    } else {
      map.setView([loc.lat, loc.lon], 11);
    }
  }, [disabled]);

  const selectPlace = useCallback(
    (place: Suggestion) => {
      const label = shortenDisplayName(place.label);
      const loc: CampaignLocationValue = {
        label,
        lat: place.lat,
        lon: place.lon,
        boundingbox: place.boundingbox,
      };
      skipSearchRef.current = true;
      setQuery(loc.label);
      setSuggestions([]);
      setOpen(false);
      onChange(loc);
      fitPlace(loc);
    },
    [onChange, fitPlace],
  );

  selectPlaceRef.current = selectPlace;

  const reverseAtRef = useRef<(lat: number, lon: number) => void>(() => {});
  reverseAtRef.current = async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lon}`);
      const data = (await res.json()) as { place?: Suggestion };
      if (data.place) selectPlaceRef.current(data.place);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!value || !mapReady) return;
    fitPlace(value);
  }, [value, mapReady, fitPlace]);

  useEffect(() => {
    let cancelled = false;

    async function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      const L = await import("leaflet");
      await import("leaflet/dist/leaflet.css");

      // Webpack breaks default marker asset paths
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (cancelled || !mapRef.current) return;

      leafletRef.current = L;
      const center: [number, number] = value
        ? [value.lat, value.lon]
        : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lon];
      const zoom = value ? 10 : DEFAULT_ZOOM;

      const map = L.map(mapRef.current, {
        center,
        zoom,
        scrollWheelZoom: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      map.on("click", (e) => {
        if (disabled) return;
        void reverseAtRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapInstance.current = map;
      setMapReady(true);

      if (value) fitPlace(value);
    }

    void initMap();

    return () => {
      cancelled = true;
      mapInstance.current?.remove();
      mapInstance.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as {
          results?: {
            place_id: number;
            display_name: string;
            lat: number;
            lon: number;
            boundingbox: [number, number, number, number];
          }[];
        };
        const items: Suggestion[] = (data.results ?? []).map((r) => ({
          place_id: r.place_id,
          label: r.display_name,
          lat: r.lat,
          lon: r.lon,
          boundingbox: r.boundingbox,
        }));
        setSuggestions(items);
        setOpen(items.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <fieldset className="space-y-2.5" disabled={disabled}>
      <legend className="text-sm font-medium text-neutral-900">Target area</legend>

      <div
        ref={mapRef}
        className={cn(
          "aspect-[5/3] max-h-[min(52vw,280px)] min-h-[180px] w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100",
          disabled && "pointer-events-none opacity-60",
        )}
        aria-label="Map to choose search area"
      />

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <Input
          id={`${mapId}-search`}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!e.target.value.trim()) onChange(null);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search city, state, or region…"
          className="pl-9"
          autoComplete="off"
          aria-label="Search area"
        />
        {open && suggestions.length > 0 ? (
          <ul
            className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
            role="listbox"
          >
            {suggestions.map((s) => (
              <li key={s.place_id} role="option">
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectPlace(s)}
                >
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden />
                  <span className="line-clamp-2 text-neutral-800">{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className="text-xs leading-relaxed text-neutral-500">
        {value ? (
          <>
            <span className="font-medium text-neutral-800">{value.label}</span>
            <span className="text-neutral-400"> · </span>
            click the map to adjust
          </>
        ) : (
          <>Search above or click the map.{searching ? " Searching…" : ""}</>
        )}
      </p>
    </fieldset>
  );
}
