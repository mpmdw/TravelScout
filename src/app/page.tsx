"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  DangerZone,
  FlightItinerary,
  FlightStatus,
  GeoIntel,
  RouteResult,
} from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

/* ---------- helpers ---------- */
function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
function fmtDur(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

/* ---------- page ---------- */
export default function Home() {
  const [origin, setOrigin] = useState("London, UK");
  const [destination, setDestination] = useState("New Delhi, India");

  const [zones, setZones] = useState<DangerZone[]>([]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [flights, setFlights] = useState<FlightItinerary[]>([]);
  const [flightsMeta, setFlightsMeta] = useState<{
    source: string;
    note?: string;
  } | null>(null);
  const [flightsLoading, setFlightsLoading] = useState(false);

  const [intel, setIntel] = useState<GeoIntel | null>(null);
  const [intelLoading, setIntelLoading] = useState(false);

  useEffect(() => {
    fetch("/api/zones")
      .then((r) => r.json())
      .then((d) => setZones(d.zones || []))
      .catch(() => {});
  }, []);

  const loadFlights = useCallback(async (r: RouteResult) => {
    setFlightsLoading(true);
    try {
      const res = await fetch("/api/flights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin: r.origin, destination: r.destination }),
      });
      const data = await res.json();
      if (res.ok) {
        setFlights(data.itineraries || []);
        setFlightsMeta({ source: data.source, note: data.note });
      }
    } finally {
      setFlightsLoading(false);
    }
  }, []);

  const loadIntel = useCallback(async (r: RouteResult) => {
    setIntelLoading(true);
    try {
      const region = r.intersectedZones.length
        ? r.intersectedZones.map((z) => z.name).join(", ")
        : `${r.origin.name} to ${r.destination.name}`;
      const res = await fetch("/api/geo-intel", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region }),
      });
      const data = await res.json();
      if (res.ok) setIntel(data.intel);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  const plan = useCallback(async () => {
    setRouteLoading(true);
    setRouteError(null);
    setRoute(null);
    setFlights([]);
    setFlightsMeta(null);
    setIntel(null);
    try {
      const res = await fetch("/api/route", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ origin, destination }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Route lookup failed.");
      const r: RouteResult = data.route;
      setRoute(r);
      void loadFlights(r);
      void loadIntel(r);
    } catch (e) {
      setRouteError((e as Error).message);
    } finally {
      setRouteLoading(false);
    }
  }, [origin, destination, loadFlights, loadIntel]);

  return (
    <div className="app">
      <header className="topbar">
        <h1>✈ TravelScout</h1>
        <span className="tag">routes that avoid dangerous airspace</span>
        <span className="spacer" />
        <span className="pill">shadow mode · mock data until you add keys</span>
      </header>

      <div className="main">
        <div className="map-pane">
          <MapView route={route} zones={zones} />
        </div>

        <aside className="sidebar">
          {/* Planner */}
          <section className="card">
            <h2>Plan a route</h2>
            <div className="col">
              <div>
                <label>From</label>
                <input
                  className="input"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="City or airport"
                />
              </div>
              <div>
                <label>To</label>
                <input
                  className="input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="City or airport"
                />
              </div>
              <div className="row">
                <button
                  className="btn btn-primary"
                  onClick={plan}
                  disabled={routeLoading}
                >
                  {routeLoading ? "Planning…" : "Plan route"}
                </button>
              </div>
              {routeError && <div className="err">{routeError}</div>}
              {route && <RouteSummary route={route} />}
            </div>
          </section>

          {/* Live risk */}
          <section className="card">
            <h2>Live risk · Claude web search</h2>
            {intelLoading && <div className="spin">Assessing the region…</div>}
            {intel && !intelLoading && (
              <IntelView
                intel={intel}
                loading={intelLoading}
                onRefresh={() => route && loadIntel(route)}
              />
            )}
            {!intel && !intelLoading && (
              <div className="muted">
                Plan a route to get a geopolitical risk read for the region.
              </div>
            )}
          </section>

          {/* Flights */}
          <section className="card">
            <h2>
              Flight options{" "}
              {flightsMeta && (
                <span className={`badge ${flightsMeta.source}`}>
                  {flightsMeta.source}
                </span>
              )}
            </h2>
            {flightsLoading && <div className="spin">Finding flights…</div>}
            {flightsMeta?.note && (
              <div className="muted small">{flightsMeta.note}</div>
            )}
            {flights.length > 0 ? (
              <FlightList flights={flights} />
            ) : (
              !flightsLoading && (
                <div className="muted">Plan a route to see flight options.</div>
              )
            )}
          </section>

          {/* Status */}
          <StatusSection />
        </aside>
      </div>

      <footer className="disclaimer">
        ⚠ Airspace polygons and reroutes are approximate and{" "}
        <strong>not for operational flight planning</strong>. Confirmation/PNR
        codes can&apos;t be looked up by public APIs — use a flight number + date
        for real status. Always check official NOTAMs and your airline.
      </footer>
    </div>
  );
}

/* ---------- sub-views ---------- */
function RouteSummary({ route }: { route: RouteResult }) {
  const crosses = route.intersectedZones.length > 0;
  return (
    <div className="col small" style={{ marginTop: 8 }}>
      <div className="kv">
        <span>From</span>
        <span>{route.origin.name.split(",")[0]}</span>
      </div>
      <div className="kv">
        <span>To</span>
        <span>{route.destination.name.split(",")[0]}</span>
      </div>
      <div className="kv">
        <span>Direct distance</span>
        <span>{route.directDistanceKm.toLocaleString()} km</span>
      </div>
      {crosses ? (
        <>
          <div className="warn">
            ⚠ Crosses: {route.intersectedZones.map((z) => z.name).join(", ")}
          </div>
          {route.avoidancePath ? (
            <div className="ok">
              ↪ Reroute avoids it: +{route.addedKm?.toLocaleString()} km (total{" "}
              {route.avoidanceDistanceKm?.toLocaleString()} km)
            </div>
          ) : (
            <div className="warn">
              Couldn&apos;t compute a clear reroute automatically.
            </div>
          )}
        </>
      ) : (
        <div className="ok">✓ Clear of configured danger zones.</div>
      )}
      <div className="muted" style={{ marginTop: 6 }}>
        Legend: <span style={{ color: "#3b82f6" }}>━ direct</span> ·{" "}
        <span style={{ color: "#ef4444" }}>┅ crosses danger</span> ·{" "}
        <span style={{ color: "#22c55e" }}>━ reroute</span> ·{" "}
        <span style={{ color: "#ef4444" }}>▦ danger zone</span>
      </div>
    </div>
  );
}

function IntelView({
  intel,
  loading,
  onRefresh,
}: {
  intel: GeoIntel;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="row" style={{ alignItems: "center", gap: 8 }}>
        <span className={`heat heat-${intel.heat}`}>
          {intel.heat.toUpperCase()}
        </span>
        <span className={`badge ${intel.source}`}>{intel.source}</span>
        <span style={{ flex: 1 }} />
        <button className="btn small" onClick={onRefresh} disabled={loading}>
          ↻ refresh
        </button>
      </div>
      <strong>{intel.headline}</strong>
      <div className="small">{intel.summary}</div>
      {intel.airspaceNotes.length > 0 && (
        <div>
          <div className="muted small">Airspace</div>
          <ul className="sources">
            {intel.airspaceNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {intel.airlineCancellations.length > 0 && (
        <div>
          <div className="muted small">Airline cancellations</div>
          <ul className="sources">
            {intel.airlineCancellations.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {intel.sources.length > 0 && (
        <div>
          <div className="muted small">Sources</div>
          <ul className="sources">
            {intel.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FlightList({ flights }: { flights: FlightItinerary[] }) {
  return (
    <div className="list">
      {flights.map((f) => (
        <div className="flight" key={f.id}>
          <div className="head">
            <strong>{f.airline}</strong>
            <span className="price">${f.priceUsd.toLocaleString()}</span>
          </div>
          <div className="meta">
            {f.flightNumbers.join(" · ")} —{" "}
            {f.stops === 0 ? "nonstop" : `${f.stops} stop${f.stops > 1 ? "s" : ""}`}{" "}
            · {fmtDur(f.durationMin)}
          </div>
          <div className="meta">
            {fmtTime(f.departUtc)} → {fmtTime(f.arriveUtc)}
          </div>
          {f.crossesDangerZone && (
            <div className="danger">
              ⚠ Routes through danger airspace. {f.dangerNote || ""}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "On Time" || status === "Landed" || status === "Departed"
      ? "var(--green)"
      : status === "Delayed"
        ? "var(--amber)"
        : status === "Cancelled"
          ? "var(--red)"
          : "var(--muted)";
  return (
    <span className="heat" style={{ background: color, color: "#0b1220" }}>
      {status}
    </span>
  );
}

function StatusView({
  status,
  source,
}: {
  status: FlightStatus;
  source?: string;
}) {
  return (
    <div className="col small" style={{ marginTop: 6 }}>
      <div className="row" style={{ alignItems: "center", gap: 8 }}>
        <StatusBadge status={status.status} />
        {source && <span className={`badge ${source}`}>{source}</span>}
        {status.delayMin > 0 && <span className="warn">+{status.delayMin} min</span>}
      </div>
      <div className="kv">
        <span>Flight</span>
        <span>
          {status.flightNumber} · {status.airline}
        </span>
      </div>
      <div className="kv">
        <span>Route</span>
        <span>
          {status.origin} → {status.destination}
        </span>
      </div>
      <div className="kv">
        <span>Departure</span>
        <span>
          {fmtTime(status.scheduledDeparture)}
          {status.delayMin > 0 ? ` → ${fmtTime(status.estimatedDeparture)}` : ""}
        </span>
      </div>
      <div className="kv">
        <span>Arrival</span>
        <span>
          {fmtTime(status.scheduledArrival)}
          {status.delayMin > 0 ? ` → ${fmtTime(status.estimatedArrival)}` : ""}
        </span>
      </div>
      {(status.gate || status.terminal) && (
        <div className="kv">
          <span>Gate / Terminal</span>
          <span>
            {status.gate || "—"} / {status.terminal || "—"}
          </span>
        </div>
      )}
      {status.confirmationRef && (
        <div className="kv">
          <span>Confirmation</span>
          <span>{status.confirmationRef}</span>
        </div>
      )}
    </div>
  );
}

function StatusSection() {
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState("");
  const [conf, setConf] = useState("");
  const [status, setStatus] = useState<FlightStatus | null>(null);
  const [meta, setMeta] = useState<{ source: string; note?: string } | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setLoading(true);
    setError(null);
    setStatus(null);
    setMeta(null);
    try {
      const params = new URLSearchParams();
      if (flightNumber) params.set("flightNumber", flightNumber);
      if (date) params.set("date", date);
      if (conf) params.set("conf", conf);
      const res = await fetch(`/api/flight-status?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lookup failed.");
      setStatus(data.status);
      setMeta({ source: data.source, note: data.note });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card">
      <h2>Check flight status</h2>
      <div className="col">
        <div className="row">
          <div style={{ flex: 1 }}>
            <label>Flight number</label>
            <input
              className="input"
              placeholder="e.g. EK7"
              value={flightNumber}
              onChange={(e) => setFlightNumber(e.target.value)}
            />
          </div>
          <div style={{ width: 150 }}>
            <label>Date</label>
            <input
              className="input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label>Confirmation code (optional)</label>
          <input
            className="input"
            placeholder="e.g. ABC123"
            value={conf}
            onChange={(e) => setConf(e.target.value)}
          />
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={check} disabled={loading}>
            {loading ? "Checking…" : "Check status"}
          </button>
        </div>
        {error && <div className="err">{error}</div>}
        {meta?.note && <div className="muted small">{meta.note}</div>}
        {status && <StatusView status={status} source={meta?.source} />}
      </div>
    </section>
  );
}
