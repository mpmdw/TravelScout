// Shared domain types for TravelScout.

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place {
  query: string; // what the user typed
  name: string; // resolved display name
  lat: number;
  lng: number;
}

export type Severity = "avoid" | "caution";

export interface DangerZone {
  id: string;
  name: string;
  severity: Severity;
  reason: string;
  /** Outer ring as [lng, lat] pairs (open ring; closed automatically). */
  polygon: [number, number][];
}

export interface ZoneHit {
  id: string;
  name: string;
  severity: Severity;
  reason: string;
}

export interface RouteResult {
  origin: Place;
  destination: Place;
  /** Great-circle path as [lng, lat] pairs. */
  directPath: [number, number][];
  directDistanceKm: number;
  intersectedZones: ZoneHit[];
  /** Rerouted path that clears the danger zones, or null if none needed/found. */
  avoidancePath: [number, number][] | null;
  avoidanceDistanceKm: number | null;
  addedKm: number | null;
}

export interface FlightItinerary {
  id: string;
  airline: string;
  flightNumbers: string[];
  origin: string; // IATA-ish
  destination: string;
  departUtc: string;
  arriveUtc: string;
  durationMin: number;
  stops: number;
  priceUsd: number;
  crossesDangerZone: boolean;
  dangerNote?: string;
  source: "mock" | "live";
}

export interface FlightStatus {
  flightNumber: string;
  date: string;
  airline: string;
  origin: string;
  destination: string;
  scheduledDeparture: string;
  estimatedDeparture: string;
  scheduledArrival: string;
  estimatedArrival: string;
  status: "On Time" | "Delayed" | "Cancelled" | "Departed" | "Landed" | "Unknown";
  delayMin: number;
  gate?: string;
  terminal?: string;
  confirmationRef?: string;
  source: "mock" | "live";
  note?: string;
}

export type Heat = "calm" | "elevated" | "high" | "severe";

export interface GeoIntel {
  region: string;
  heat: Heat;
  headline: string;
  summary: string;
  airspaceNotes: string[];
  airlineCancellations: string[];
  sources: { title: string; url: string }[];
  generatedAt: string;
  source: "mock" | "live";
}
