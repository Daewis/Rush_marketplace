import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Crosshair, Loader2 } from "lucide-react";

interface LocationValue {
  address: string;
  lat?: number;
  lng?: number;
}

interface LocationPickerProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  placeholder?: string;
  // Default map center before anything is picked — defaults to Unilag Akoka.
  defaultCenter?: [number, number];
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!MAPBOX_TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.features?.[0]?.place_name || null;
  } catch {
    return null;
  }
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  value,
  onChange,
  placeholder = "Address",
  defaultCenter = [3.3958, 6.5158], // Unilag Akoka
}) => {
  const [mapOpen, setMapOpen] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const placePoint = async (lat: number, lng: number) => {
    setGeocoding(true);
    const address = (await reverseGeocode(lat, lng)) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    setGeocoding(false);
    onChange({ address, lat, lng });
  };

  useEffect(() => {
    if (!mapOpen || !MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    if (!mapboxgl.supported()) {
      setMapUnavailable(true);
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const center: [number, number] = value.lat && value.lng ? [value.lng, value.lat] : defaultCenter;

    try {
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center,
        zoom: 15,
      });
      mapRef.current = map;

      if (value.lat && value.lng) {
        markerRef.current = new mapboxgl.Marker({ color: "#ea580c" }).setLngLat([value.lng, value.lat]).addTo(map);
      }

      map.on("click", (e) => {
        const { lat, lng } = e.lngLat;
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        } else {
          markerRef.current = new mapboxgl.Marker({ color: "#ea580c", draggable: true })
            .setLngLat([lng, lat])
            .addTo(map);
          markerRef.current.on("dragend", () => {
            const pos = markerRef.current!.getLngLat();
            placePoint(pos.lat, pos.lng);
          });
        }
        placePoint(lat, lng);
      });
    } catch (err) {
      console.error("Failed to initialize Mapbox map picker:", err);
      setMapUnavailable(true);
      mapRef.current = null;
      return;
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapOpen]);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        await placePoint(position.coords.latitude, position.coords.longitude);
        setLocating(false);
        setMapOpen(true);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1.5">
        <input
          type="text"
          required
          placeholder={placeholder}
          value={value.address}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
          className="flex-1 px-3 py-2 text-xs bg-slate-50 rounded-lg border border-slate-200 focus:bg-white focus:outline-none"
        />
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          title="Use my current location"
          className="shrink-0 px-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg text-slate-600"
        >
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => setMapOpen((o) => !o)}
          className={`shrink-0 px-2.5 rounded-lg flex items-center gap-1 text-[11px] font-bold ${
            value.lat && value.lng ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          } hover:opacity-80`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {value.lat && value.lng ? "Set" : "Pick"}
        </button>
      </div>

      {geocoding && <p className="text-[10px] text-slate-400">Looking up address…</p>}

      {mapOpen && (
        <div className="space-y-1">
          {MAPBOX_TOKEN && !mapUnavailable ? (
            <div ref={containerRef} className="w-full h-48 rounded-lg overflow-hidden border border-slate-200" />
          ) : (
            <div className="w-full h-24 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center">
              <p className="text-[10px] text-slate-500 px-3 text-center">
                {!MAPBOX_TOKEN
                  ? "Set VITE_MAPBOX_ACCESS_TOKEN to enable the map picker."
                  : "This browser/environment doesn't support the map — use 'Use My Location' instead, or type the address directly."}
              </p>
            </div>
          )}
          {!mapUnavailable && (
            <p className="text-[10px] text-slate-400">Tap the map to drop a pin, or drag it to adjust.</p>
          )}
        </div>
      )}
    </div>
  );
};