import { FlightItinerary, Place } from "../types";
import { hasFlightApi } from "../config";
import { planRoute } from "../geo";
import { DANGER_ZONES } from "../dangerZones";

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

export interface FlightSearchResult {
  itineraries: FlightItinerary[];
  source: "mock" | "live";
  note?: string;
}

/**
 * Search flights between two places.
 *
 * SHADOW SEAM: when FLIGHT_API_KEY is set, plug the real provider into the
 * marked block (map its response into FlightItinerary[]). Until then — and
 * whenever no key is present — realistic mock itineraries are returned.
 */
export async function searchFlights(
  origin: Place,
  destination: Place,
): Promise<FlightSearchResult> {
  if (hasFlightApi()) {
    // TODO(real API): call your provider (Amadeus / Aviationstack / AeroDataBox)
    // using getConfig().flightApiBase + flightApiKey and map to FlightItinerary[].
    return {
      itineraries: mockFlights(origin, destination),
      source: "mock",
      note: "Live flight adapter not wired yet — showing mock data.",
    };
  }
  return { itineraries: mockFlights(origin, destination), source: "mock" };
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

    // A nonstop is assumed to follow the (risky) direct path; connections detour.
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
