"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DangerZone, RouteResult } from "@/lib/types";

type LL = [number, number]; // [lat, lng] for Leaflet

// GeoJSON order is [lng, lat]; Leaflet wants [lat, lng].
const toLatLng = (c: [number, number]): LL => [c[1], c[0]];

export default function MapView({
  route,
  zones,
}: {
  route: RouteResult | null;
  zones: DangerZone[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Initialise the map once.
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = L.map(containerRef.current, { worldCopyJump: true }).setView(
      [32, 35],
      3,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Redraw zones + route whenever they change.
  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) return;
    group.clearLayers();

    for (const z of zones) {
      const ring = z.polygon.map(toLatLng);
      L.polygon(ring, {
        color: "#ef4444",
        weight: 1,
        fillColor: "#ef4444",
        fillOpacity: 0.15,
      })
        .bindTooltip(`${z.name} — ${z.reason}`, { sticky: true })
        .addTo(group);
    }

    if (route) {
      const crosses = route.intersectedZones.length > 0;
      const direct = route.directPath.map(toLatLng);
      L.polyline(direct, {
        color: crosses ? "#ef4444" : "#3b82f6",
        weight: 3,
        dashArray: crosses ? "6 8" : undefined,
      })
        .bindTooltip(
          crosses ? "Direct path (crosses danger airspace)" : "Direct path",
          { sticky: true },
        )
        .addTo(group);

      let avoid: LL[] = [];
      if (route.avoidancePath) {
        avoid = route.avoidancePath.map(toLatLng);
        L.polyline(avoid, { color: "#22c55e", weight: 4 })
          .bindTooltip("Suggested reroute (avoids danger airspace)", {
            sticky: true,
          })
          .addTo(group);
      }

      L.circleMarker([route.origin.lat, route.origin.lng], {
        radius: 6,
        color: "#0b1220",
        fillColor: "#22c55e",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(`From: ${route.origin.name}`)
        .addTo(group);
      L.circleMarker([route.destination.lat, route.destination.lng], {
        radius: 6,
        color: "#0b1220",
        fillColor: "#ef4444",
        fillOpacity: 1,
        weight: 2,
      })
        .bindTooltip(`To: ${route.destination.name}`)
        .addTo(group);

      const all: LL[] = [...direct, ...avoid];
      if (all.length > 1) {
        map.fitBounds(L.latLngBounds(all), { padding: [40, 40] });
      }
    }
  }, [route, zones]);

  return <div ref={containerRef} aria-label="Route map" />;
}
