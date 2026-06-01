import * as turf from "@turf/turf";
import type { Feature, LineString, MultiLineString, Polygon } from "geojson";
import { DangerZone, LatLng, Place, RouteResult } from "./types";

type Coord = [number, number]; // [lng, lat]

function closeRing(ring: Coord[]): Coord[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

function zonePolygon(zone: DangerZone): Feature<Polygon> {
  return turf.polygon([closeRing(zone.polygon)], { id: zone.id });
}

/** Great-circle path between two points as [lng, lat] pairs. */
export function greatCircleCoords(from: LatLng, to: LatLng, npoints = 64): Coord[] {
  try {
    const gc = turf.greatCircle(
      turf.point([from.lng, from.lat]),
      turf.point([to.lng, to.lat]),
      { npoints },
    ) as Feature<LineString | MultiLineString>;
    const g = gc.geometry;
    if (g.type === "LineString") {
      return g.coordinates.map((c) => [c[0], c[1]] as Coord);
    }
    return (g.coordinates as number[][][]).flatMap((seg) =>
      seg.map((c) => [c[0], c[1]] as Coord),
    );
  } catch {
    return [
      [from.lng, from.lat],
      [to.lng, to.lat],
    ];
  }
}

function lengthKm(coords: Coord[]): number {
  if (coords.length < 2) return 0;
  return turf.length(turf.lineString(coords), { units: "kilometers" });
}

function pathIntersectsZone(coords: Coord[], zone: Feature<Polygon>): boolean {
  if (coords.length < 2) return false;
  return turf.booleanIntersects(turf.lineString(coords), zone);
}

const round = (n: number): number => Math.round(n);

/**
 * Build a direct great-circle route, detect which danger zones it crosses, and
 * (if any) compute a heuristic detour that clears them.
 */
export function planRoute(
  origin: Place,
  destination: Place,
  zones: DangerZone[],
): RouteResult {
  const from: LatLng = { lat: origin.lat, lng: origin.lng };
  const to: LatLng = { lat: destination.lat, lng: destination.lng };

  const directPath = greatCircleCoords(from, to);
  const directDistanceKm = lengthKm(directPath);

  const zoneFeatures = zones.map((z) => ({ zone: z, feat: zonePolygon(z) }));
  const intersected = zoneFeatures.filter(({ feat }) =>
    pathIntersectsZone(directPath, feat),
  );

  const result: RouteResult = {
    origin,
    destination,
    directPath,
    directDistanceKm: round(directDistanceKm),
    intersectedZones: intersected.map(({ zone }) => ({
      id: zone.id,
      name: zone.name,
      severity: zone.severity,
      reason: zone.reason,
    })),
    avoidancePath: null,
    avoidanceDistanceKm: null,
    addedKm: null,
  };

  if (intersected.length === 0) return result;

  const avoidance = computeAvoidance(
    from,
    to,
    intersected.map((i) => i.feat),
  );
  if (avoidance) {
    result.avoidancePath = avoidance;
    const d = lengthKm(avoidance);
    result.avoidanceDistanceKm = round(d);
    result.addedKm = round(d - directDistanceKm);
  }
  return result;
}

/**
 * Heuristic avoidance: try a single waypoint north or south of the combined
 * zone bounding box, growing the margin until the path clears every zone, and
 * keep the shorter of the two.
 */
function computeAvoidance(
  from: LatLng,
  to: LatLng,
  zones: Feature<Polygon>[],
): Coord[] | null {
  const fc = turf.featureCollection(zones);
  const bb = turf.bbox(fc); // [minLng, minLat, maxLng, maxLat]
  const minLat = bb[1];
  const maxLat = bb[3];
  const midLng = (from.lng + to.lng) / 2;

  let best: Coord[] | null = null;
  let bestDist = Infinity;

  for (let margin = 2; margin <= 14; margin += 2) {
    const candidates: LatLng[] = [
      { lat: maxLat + margin, lng: midLng }, // detour north
      { lat: minLat - margin, lng: midLng }, // detour south
    ];
    for (const wp of candidates) {
      const path: Coord[] = [
        ...greatCircleCoords(from, wp),
        ...greatCircleCoords(wp, to).slice(1),
      ];
      const clears = zones.every((z) => !pathIntersectsZone(path, z));
      if (clears) {
        const d = lengthKm(path);
        if (d < bestDist) {
          bestDist = d;
          best = path;
        }
      }
    }
    if (best) break; // smallest margin that clears wins
  }
  return best;
}
