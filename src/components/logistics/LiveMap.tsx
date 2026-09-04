import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  color: string;
  label: string;
  // 'pulse' renders an animated live-position dot (for the driver's real
  // GPS marker); 'pin' renders a static pickup/dropoff-style marker.
  variant?: "pulse" | "pin";
}

interface LiveMapProps {
  markers: MapMarker[];
  height?: string;
  // If true, the map recenters to fit all markers whenever they change.
  // Turn off (e.g. while a driver is manually panning) to avoid yanking
  // the view around under them.
  autoFit?: boolean;
}

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined;

export const LiveMap: React.FC<LiveMapProps> = ({ markers, height = "280px", autoFit = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRefs = useRef<Record<string, mapboxgl.Marker>>({});
  const [mapUnavailable, setMapUnavailable] = useState<string | null>(null);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    // Mapbox GL needs a working WebGL context — some embedded preview
    // iframes, sandboxed environments, or devices with hardware
    // acceleration disabled don't have one. Checking mapboxgl.supported()
    // first, and still wrapping creation in try/catch as a second line of
    // defense (GPU blocklists can fail context creation even when
    // supported() reports true), keeps this from crashing the whole
    // dashboard with an uncaught error.
    if (!mapboxgl.supported()) {
      setMapUnavailable("This browser/environment doesn't support WebGL, so the live map can't render here.");
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const initialCenter: [number, number] =
      markers.length > 0 ? [markers[0].lng, markers[0].lat] : [3.3958, 6.5158]; // Unilag Akoka, fallback

    try {
      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: initialCenter,
        zoom: 14,
      });
      mapRef.current.on("error", (e) => {
        console.error("Mapbox runtime error:", e?.error);
      });
      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    } catch (err) {
      console.error("Failed to initialize Mapbox map:", err);
      setMapUnavailable("Couldn't start the live map in this browser/environment.");
      mapRef.current = null;
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !MAPBOX_TOKEN) return;

    const currentIds = new Set(markers.map((m) => m.id));

    // Remove markers that no longer exist
    Object.keys(markerRefs.current).forEach((id) => {
      if (!currentIds.has(id)) {
        markerRefs.current[id].remove();
        delete markerRefs.current[id];
      }
    });

    markers.forEach((m) => {
      const existing = markerRefs.current[m.id];
      if (existing) {
        existing.setLngLat([m.lng, m.lat]);
        return;
      }

      const el = document.createElement("div");
      if (m.variant === "pulse") {
        el.className = "relative flex items-center justify-center";
        el.innerHTML = `
          <span class="absolute inline-flex h-6 w-6 rounded-full opacity-60 animate-ping" style="background-color:${m.color}"></span>
          <span class="relative inline-flex rounded-full h-3.5 w-3.5 border-2 border-white shadow" style="background-color:${m.color}"></span>
        `;
      } else {
        el.style.width = "22px";
        el.style.height = "22px";
        el.style.borderRadius = "50% 50% 50% 0";
        el.style.transform = "rotate(-45deg)";
        el.style.background = m.color;
        el.style.border = "2px solid white";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.3)";
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: m.variant === "pulse" ? "center" : "bottom" })
        .setLngLat([m.lng, m.lat])
        .setPopup(new mapboxgl.Popup({ offset: 20 }).setText(m.label))
        .addTo(map);

      markerRefs.current[m.id] = marker;
    });

    if (autoFit && markers.length > 0) {
      if (markers.length === 1) {
        map.easeTo({ center: [markers[0].lng, markers[0].lat], zoom: 15, duration: 600 });
      } else {
        const bounds = new mapboxgl.LngLatBounds();
        markers.forEach((m) => bounds.extend([m.lng, m.lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 600 });
      }
    }
  }, [markers, autoFit]);

  if (!MAPBOX_TOKEN || mapUnavailable) {
    return (
      <div
        style={{ height }}
        className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-center px-4"
      >
        <p className="text-xs text-slate-500">
          {!MAPBOX_TOKEN ? (
            <>
              Live map unavailable — set{" "}
              <code className="bg-slate-200 px-1 rounded text-[10px]">VITE_MAPBOX_ACCESS_TOKEN</code> in your
              environment to enable it.
            </>
          ) : (
            mapUnavailable
          )}
        </p>
      </div>
    );
  }

  return <div ref={containerRef} style={{ height }} className="w-full rounded-xl overflow-hidden border border-slate-200" />;
};