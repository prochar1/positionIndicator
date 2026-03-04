// src/components/MapComponent.tsx
"use client";

import { useEffect, useState, Fragment } from "react";
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
  deviceName?: string;
  deviceId?: string;
}

export default function MapComponent() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [leafletLib, setLeafletLib] = useState<typeof import("leaflet") | null>(
    null,
  );

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
        setLeafletLib(L);
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

  // Seskupení podle zařízení a filtrace
  const devicePaths: {
    deviceId: string;
    deviceName: string;
    color: string;
    positions: [number, number][];
    latestLocation: LocationData;
  }[] = [];

  const COLORS = [
    "#e11d48",
    "#2563eb",
    "#16a34a",
    "#ca8a04",
    "#9333ea",
    "#0d9488",
    "#ea580c",
  ];

  if (locations.length > 0) {
    const locationsByDevice = locations.reduce(
      (acc: Record<string, LocationData[]>, curr: LocationData) => {
        const id = curr.deviceId || "unknown";
        if (!acc[id]) acc[id] = [];
        acc[id].push(curr);
        return acc;
      },
      {},
    );

    for (const [deviceId, locs] of Object.entries(locationsByDevice)) {
      const MIN_DISTANCE_DEGREES = 0.0001;
      const filtered = locs.reduce(
        (acc: LocationData[], curr: LocationData) => {
          if (acc.length === 0) return [curr];
          const last = acc[acc.length - 1];
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

      if (filtered.length > 0) {
        let hash = 0;
        for (let i = 0; i < deviceId.length; i++) {
          hash = deviceId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const color = COLORS[Math.abs(hash) % COLORS.length];

        devicePaths.push({
          deviceId,
          deviceName:
            locs[locs.length - 1].deviceName ||
            (deviceId === "unknown" ? "Neznámé zařízení" : deviceId),
          color,
          positions: filtered.map((loc) => [loc.latitude, loc.longitude]),
          latestLocation: locs[locs.length - 1], // Úplně poslední bod cesty (i když neprošel filtrem vzdálenosti)
        });
      }
    }
  }

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

        {devicePaths.map((device) => {
          // Vytvoření vlastního ikonky dynamicky s barvou
          let icon;
          if (leafletLib) {
            icon = new leafletLib.DivIcon({
              className: "bg-transparent border-none",
              html: `<svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.3));"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="${device.color}"/><circle cx="12" cy="9" r="3" fill="white"/></svg>`,
              iconSize: [32, 32],
              iconAnchor: [16, 32],
              popupAnchor: [0, -32],
            });
          }

          return (
            <Fragment key={device.deviceId}>
              {/* Čára propojující celou trasu */}
              {device.positions.length > 1 && (
                <Polyline
                  positions={device.positions}
                  color={device.color}
                  weight={4}
                  opacity={0.8}
                />
              )}

              {/* Jediný zobrazený Marker - výlučně na poslední pozici zařízení */}
              {icon && (
                <Marker
                  position={[
                    device.latestLocation.latitude,
                    device.latestLocation.longitude,
                  ]}
                  icon={icon}
                >
                  <Popup>
                    <strong>{device.deviceName}</strong>
                    <br />
                    {device.deviceId !== "unknown" && (
                      <span className="text-xs text-gray-500">
                        ID: {device.deviceId}
                        <br />
                      </span>
                    )}
                    Čas:{" "}
                    {new Date(
                      device.latestLocation.timestamp,
                    ).toLocaleTimeString()}
                    <br />
                    Lat: {device.latestLocation.latitude.toFixed(5)}
                    <br />
                    Lng: {device.latestLocation.longitude.toFixed(5)}
                  </Popup>
                </Marker>
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
