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

  if (loading)
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );

  // Filtr: Vyhoď body, které jsou k sobě blíž než ~10 metrů (zhruba 0.0001 stupně)
  const MIN_DISTANCE_DEGREES = 0.0001;
  const filteredLocations = locations.reduce(
    (acc: LocationData[], curr: LocationData) => {
      if (acc.length === 0) return [curr];
      const last = acc[acc.length - 1];

      // Vypočti přibližnou vzdálenost (Pythagoras na stupních na tak malou vzdálenost stačí)
      const distance = Math.sqrt(
        Math.pow(curr.latitude - last.latitude, 2) +
          Math.pow(curr.longitude - last.longitude, 2),
      );

      if (distance > MIN_DISTANCE_DEGREES) {
        acc.push(curr);
      }
      return acc;
    },
    [],
  );

  const latestLocation = locations[locations.length - 1];
  const positions: [number, number][] = filteredLocations.map((loc) => [
    loc.latitude,
    loc.longitude,
  ]);

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={14}
        className="h-full w-full relative z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Čára propojující celou trasu (jen vyfiltrované body) */}
        {positions.length > 1 && (
          <Polyline
            positions={positions}
            color="#3b82f6"
            weight={4}
            opacity={0.7}
          />
        )}

        {/* Startovní bod cesty (volitelně) */}
        {filteredLocations.length > 1 && (
          <Marker
            position={[
              filteredLocations[0].latitude,
              filteredLocations[0].longitude,
            ]}
          >
            <Popup>Start</Popup>
          </Marker>
        )}

        {/* Aktuální (poslední) poloha */}
        {latestLocation && (
          <Marker
            position={[latestLocation.latitude, latestLocation.longitude]}
          >
            <Popup>
              <strong>Aktuální poloha</strong>
              <br />
              Čas: {new Date(latestLocation.timestamp).toLocaleTimeString()}
              <br />
              Lat: {latestLocation.latitude.toFixed(5)}
              <br />
              Lng: {latestLocation.longitude.toFixed(5)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
