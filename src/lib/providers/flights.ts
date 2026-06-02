import { FlightItinerary, Place } from "../types";
import { hasFlightSearch } from "../config";
import { planRoute } from "../geo";
import { DANGER_ZONES } from "../dangerZones";
import { nearestAirportCode, searchFlightOffers } from "./amadeus";

export interface FlightSearchResult {
  itineraries: FlightItinerary[];
  source: "mock" | "live";
  note?: string;
}

/**
 * Search flights between two places.
 *
 * - With Amadeus credentials set (`AMADEUS_CLIENT_ID` + `AMADEUS_CLIENT_SECRET`),
 *   resolves each place to its nearest airport, fetches live offers, and maps
 *   them into FlightItinerary[]. Results are cached per (origin, dest, date).
 * - Without credentials — or if the live call fails — realistic MOCK itineraries
 *   are returned (shadow mode), with a `note` when it was a fallback.
 */
export async function searchFlights(
  origin: Place,
  destination: Place,
  opts: { date?: string } = {},
): Promise<FlightSearchResult> {
  const date = opts.date || defaultDepartureDate();

  if (hasFlightSearch()) {
    const key = cacheKey(origin, destination, date);
    const cached = cacheGet(key);
    if (cached) return cached;
    try {
      const live = await liveFlights(origin, destination, date);
      cacheSet(key, live);
      return live;
    } catch (e) {
      return {
        itineraries: mockFlights(origin, destination),
        source: "mock",
        note: `Live flight search failed (${(e as Error).message}); showing mock data.`,
      };
    }
  }

  return { itineraries: mockFlights(origin, destination), source: "mock" };
}

/* ---------------- live (Amadeus) ---------------- */

async function liveFlights(
  origin: Place,
  destination: Place,
  date: string,
): Promise<FlightSearchResult> {
  const [oCode, dCode] = await Promise.all([
    nearestAirportCode(origin.lat, origin.lng),
    nearestAirportCode(destination.lat, destination.lng),
  ]);
  if (!oCode || !dCode) throw new Error("could not resolve nearby airports");

  const { offers, carriers } = await searchFlightOffers(oCode, dCode, date);

  const route = planRoute(origin, destination, DANGER_ZONES);
  const crosses = route.intersectedZones.length > 0;
  const dangerNote = crosses
    ? `Direct path crosses: ${route.intersectedZones.map((z) => z.name).join(", ")}.`
    : undefined;

  if (offers.length === 0) {
    return {
      itineraries: [],
      source: "live",
      note: `No flights found ${oCode}→${dCode} on ${date}.`,
    };
  }

  const itineraries = offers
    .slice(0, 6)
    .map((offer, i) => mapOffer(offer, carriers, oCode, dCode, crosses, dangerNote, i));
  return {
    itineraries,
    source: "live",
    note: `Live via Amadeus · ${oCode}→${dCode} · ${date}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapOffer(
  offer: any,
  carriers: Record<string, string>,
  oCode: string,
  dCode: string,
  crosses: boolean,
  dangerNote: string | undefined,
  i: number,
): FlightItinerary {
  const itinerary = offer?.itineraries?.[0];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const segs: any[] = Array.isArray(itinerary?.segments) ? itinerary.segments : [];
  const first = segs[0];
  const last = segs[segs.length - 1];
  const stops = Math.max(0, segs.length - 1);

  const carrierCode = offer?.validatingAirlineCodes?.[0] || first?.carrierCode || "";
  const airline = titleCase(carriers[carrierCode] || carrierCode || "Airline");
  const flightNumbers = segs.map((s) => `${s.carrierCode}${s.number}`);
  const durationMin = itinerary?.duration ? isoDurationToMin(itinerary.duration) : 0;
  const priceUsd =
    Math.round(parseFloat(offer?.price?.grandTotal ?? offer?.price?.total ?? "0")) || 0;
  const nonstopCrosses = crosses && stops === 0;

  return {
    id: `amadeus-${offer?.id ?? i}`,
    airline,
    flightNumbers: flightNumbers.length ? flightNumbers : [carrierCode || "—"],
    origin: first?.departure?.iataCode || oCode,
    destination: last?.arrival?.iataCode || dCode,
    departUtc: first?.departure?.at || "",
    arriveUtc: last?.arrival?.at || "",
    durationMin,
    stops,
    priceUsd,
    crossesDangerZone: nonstopCrosses,
    dangerNote: nonstopCrosses ? dangerNote : undefined,
    source: "live",
  };
}

function isoDurationToMin(d: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?/.exec(d || "");
  return (m?.[1] ? parseInt(m[1], 10) : 0) * 60 + (m?.[2] ? parseInt(m[2], 10) : 0);
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function defaultDepartureDate(): string {
  return new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
}

/* ---------------- per-(origin,dest,date) cache ---------------- */

const CACHE_TTL_MS = 5 * 60_000;
const cache = new Map<string, { at: number; value: FlightSearchResult }>();

function cacheKey(o: Place, d: Place, date: string): string {
  return `${o.lat.toFixed(2)},${o.lng.toFixed(2)}|${d.lat.toFixed(2)},${d.lng.toFixed(2)}|${date}`;
}
function cacheGet(k: string): FlightSearchResult | null {
  const e = cache.get(k);
  if (e && Date.now() - e.at < CACHE_TTL_MS) return e.value;
  if (e) cache.delete(k);
  return null;
}
function cacheSet(k: string, v: FlightSearchResult): void {
  cache.set(k, { at: Date.now(), value: v });
}

/* ---------------- mock (shadow mode) ---------------- */

const AIRLINES = [
  { name: "Emirates", code: "EK" },
  { name: "Qatar Airways", code: "QR" },
  { name: "Turkish Airlines", code: "TK" },
  { name: "Lufthansa", code: "LH" },
  { name: "Air France", code: "AF" },
];

function pseudoIata(p: Place): string {
  const letters = (p.name.match(/[A-Za-z]/g) || ["X"]).slice(0, 3);
  return letters.join("").toUpperCase().padEnd(3, "X");
}

function mockFlights(origin: Place, destination: Place): FlightItinerary[] {
  const route = planRoute(origin, destination, DANGER_ZONES);
  const crosses = route.intersectedZones.length > 0;
  const dangerNote = crosses
    ? `Direct path crosses: ${route.intersectedZones.map((z) => z.name).join(", ")}.`
    : undefined;

  const baseDur = Math.max(90, Math.round(route.directDistanceKm / 13)); // ~780 km/h
  const oIata = pseudoIata(origin);
  const dIata = pseudoIata(destination);
  const now = Date.now();

  return [0, 1, 2, 3].map((i) => {
    const airline = AIRLINES[i % AIRLINES.length];
    const stops = i === 0 ? 0 : i === 3 ? 2 : 1;
    const extra = stops * (60 + i * 25);
    const durationMin = baseDur + extra;
    const depart = new Date(now + (6 + i * 3) * 3600_000);
    const arrive = new Date(depart.getTime() + durationMin * 60_000);
    const price = Math.round(380 + route.directDistanceKm * 0.06 + stops * 40 + i * 25);

    const flightNumbers = [`${airline.code}${100 + i * 7}`];
    if (stops > 0) flightNumbers.push(`${airline.code}${200 + i * 11}`);

    const nonstopCrosses = crosses && stops === 0;

    return {
      id: `mock-${i}`,
      airline: airline.name,
      flightNumbers,
      origin: oIata,
      destination: dIata,
      departUtc: depart.toISOString(),
      arriveUtc: arrive.toISOString(),
      durationMin,
      stops,
      priceUsd: price,
      crossesDangerZone: nonstopCrosses,
      dangerNote: nonstopCrosses ? dangerNote : undefined,
      source: "mock" as const,
    };
  });
}
