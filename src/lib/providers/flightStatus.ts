import { FlightStatus } from "../types";
import { hasFlightApi } from "../config";

export interface FlightStatusResult {
  status: FlightStatus | null;
  source: "mock" | "live";
  note?: string;
}

export interface FlightStatusQuery {
  flightNumber?: string;
  date?: string; // YYYY-MM-DD
  confirmationRef?: string;
}

/**
 * Look up flight status.
 *
 * Reality check: public flight-status APIs key off FLIGHT NUMBER + DATE, not
 * airline confirmation/PNR codes (those require airline login). The conf-code
 * field is supported in mock mode for convenience and clearly flagged.
 *
 * SHADOW SEAM: with FLIGHT_API_KEY set + a flight number, call the real status
 * provider in the marked block and map to FlightStatus.
 */
export async function getFlightStatus(
  q: FlightStatusQuery,
): Promise<FlightStatusResult> {
  const flightNumber = (q.flightNumber || "").trim().toUpperCase();
  const date = q.date || new Date().toISOString().slice(0, 10);

  if (hasFlightApi() && flightNumber) {
    // TODO(real API): look up by flightNumber + date and map to FlightStatus.
    return {
      status: mockStatus(flightNumber, date, q.confirmationRef),
      source: "mock",
      note: "Live status adapter not wired yet — showing mock data.",
    };
  }

  const note =
    q.confirmationRef && !flightNumber
      ? "Heads-up: confirmation/PNR codes can't be resolved by public flight APIs (they need airline login). This is demo data — for real status, use the flight number + date."
      : undefined;

  return {
    status: mockStatus(flightNumber, date, q.confirmationRef),
    source: "mock",
    note,
  };
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const pad = (n: number) => String(n).padStart(2, "0");

function mockStatus(
  flightNumber: string,
  date: string,
  confirmationRef?: string,
): FlightStatus {
  const key = flightNumber || confirmationRef || "DEMO123";
  const h = hashStr(key + date);

  const states: FlightStatus["status"][] = [
    "On Time",
    "Delayed",
    "On Time",
    "Departed",
    "Landed",
    "Cancelled",
  ];
  const status = states[h % states.length];
  const delayMin = status === "Delayed" ? 20 + (h % 90) : 0;

  const depHour = 6 + (h % 14);
  const depMin = (h >>> 3) % 60; // unsigned shift: h can exceed 2^31
  // Build the scheduled time from numeric date parts (robust to parsing/sign).
  const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  const dayMs = dm
    ? Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]))
    : Date.now();
  const sched = new Date(dayMs + (depHour * 60 + depMin) * 60_000);
  const durMin = 90 + (h % 600);
  const arr = new Date(sched.getTime() + durMin * 60_000);
  const estDep = new Date(sched.getTime() + delayMin * 60_000);
  const estArr = new Date(arr.getTime() + delayMin * 60_000);

  const AIR: Record<string, string> = {
    EK: "Emirates",
    QR: "Qatar Airways",
    TK: "Turkish Airlines",
    LH: "Lufthansa",
    AF: "Air France",
    BA: "British Airways",
  };
  const prefix = (flightNumber.match(/^[A-Z]{2}/) || ["XX"])[0];
  const airline = AIR[prefix] || "Demo Air";
  const ports = ["LHR", "DXB", "IST", "FRA", "CDG", "JFK", "DEL", "SIN"];
  const origin = ports[h % ports.length];
  const destination = ports[(h >>> 4) % ports.length];

  return {
    flightNumber: flightNumber || "(from confirmation)",
    date,
    airline,
    origin,
    destination: destination === origin ? ports[(h >>> 6) % ports.length] : destination,
    scheduledDeparture: sched.toISOString(),
    estimatedDeparture: estDep.toISOString(),
    scheduledArrival: arr.toISOString(),
    estimatedArrival: estArr.toISOString(),
    status,
    delayMin,
    gate: `${String.fromCharCode(65 + (h % 6))}${1 + (h % 30)}`,
    terminal: `${1 + (h % 4)}`,
    confirmationRef: confirmationRef || undefined,
    source: "mock",
  };
}
