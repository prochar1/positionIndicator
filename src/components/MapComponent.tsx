// src/components/MapComponent.tsx
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);

interface LocationData {
  latitude: number;
  longitude: number;
  timestamp: number;
}

export default function MapComponent() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Default center (Prague) if no data
  const defaultCenter: [number, number] = [50.08804, 14.42076];
  const center: [number, number] =
    locations.length > 0
      ? [
          locations[locations.length - 1].latitude,
          locations[locations.length - 1].longitude,
        ]
      : defaultCenter;

  const positions: [number, number][] = locations.map((loc) => [
    loc.latitude,
    loc.longitude,
  ]);

  useEffect(() => {
    // Fix Leaflet marker icons not showing in Next.js
    (async function init() {
      // Create Leaflet icon overrides only in browser
      if (typeof window !== "undefined") {
        const L = await import("leaflet");
        delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)
          ._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl:
            "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });
      }
    })();
  }, []);

  const fetchLocations = async () => {
    try {
      const res = await fetch("/api/location");
      const data = await res.json();
      setLocations(data);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    const interval = setInterval(fetchLocations, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading map...</div>;

  return (
    <div className="h-[500px] w-full border rounded-lg overflow-hidden relative">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full relative z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {locations.map((loc, idx) => (
          <Marker key={idx} position={[loc.latitude, loc.longitude]}>
            <Popup>
              Time: {new Date(loc.timestamp).toLocaleString()}
              <br />
              Lat: {loc.latitude.toFixed(6)}
              <br />
              Lng: {loc.longitude.toFixed(6)}
            </Popup>
          </Marker>
        ))}
        {positions.length > 1 && (
          <Polyline positions={positions} color="blue" />
        )}
      </MapContainer>
    </div>
  );
}
