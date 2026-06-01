# ✈ TravelScout

Map flight routes that **avoid dangerous airspace**, check flight status, and get a live,
web-searched read on geopolitical risk — built so you can run it locally for a friend *or*
deploy it to the cloud unchanged.

> Built around a real need: routing **around Iranian airspace** given current conditions —
> with the danger zones fully configurable.

## What it does
- **🗺️ Route map** — enter two locations; see the great-circle path, shaded **danger zones**
  (Iran by default), and an automatic **reroute** around them, with the added distance.
- **✈️ Flight options** — itineraries for the pair; any that route through danger airspace are flagged.
- **🌡️ Live risk (Claude web search)** — heat level (calm → severe), summary, airspace notes,
  airline cancellations, and **cited sources**.
- **🟢 Flight status** — by flight number + date (with an optional confirmation-code field).
- **🔒 Optional access gate** — a username/password you set, for sharing externally.

## Shadow mode (no keys required)
Every feature works on realistic **mock data** until you supply a key — then it switches to live
data. Run the whole app immediately and "turn on" each piece when you have its key.

| Feature | Without a key | With a key |
|---|---|---|
| Map + routing + avoidance | ✅ full (OpenStreetMap — never needs a key) | — |
| Flight search / status | ✅ mock | `FLIGHT_API_KEY` → live adapter (seam ready) |
| Live risk | ✅ mock | `ANTHROPIC_API_KEY` → Claude web search |

## Quick start
```bash
npm install
cp .env.example .env.local   # optional — the app runs fine without it
npm run dev                  # http://localhost:3000
```

## Configuration
Copy `.env.example` → `.env.local`. Everything is optional:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Live geopolitical risk via Claude web search |
| `ANTHROPIC_MODEL` | Model to use (default `claude-sonnet-4-6`) |
| `FLIGHT_API_KEY` / `FLIGHT_API_BASE` | Live flight search/status (adapter seam) |
| `BASIC_AUTH_USER` / `BASIC_AUTH_PASS` | Enable the login gate (set **both**) |

## Two ways to host it

### A) Run locally and share with a friend (behind a login)
1. Set a login in `.env.local`:
   ```env
   BASIC_AUTH_USER=friend
   BASIC_AUTH_PASS=some-shared-password
   ```
2. Build and start:
   ```bash
   npm run build && npm start        # serves on :3000
   ```
3. Expose it over HTTPS with a tunnel (no account needed):
   ```bash
   brew install cloudflared
   cloudflared tunnel --url http://localhost:3000
   ```
   Share the printed `https://….trycloudflare.com` URL. Your friend opens it, enters the
   username/password, and they're in. (ngrok works too: `ngrok http 3000`.)

> The gate is HTTP Basic Auth — only enable it **behind HTTPS** (tunnels and Vercel both provide
> it). Leave both vars unset for open local development.

### B) Deploy to the cloud (Vercel)
It's a standard Next.js app:
```bash
npm i -g vercel
vercel            # follow the prompts
```
Add the same environment variables in the Vercel dashboard
(Project → Settings → Environment Variables). Vercel provides HTTPS automatically and the same
auth gate applies.

## Wiring real data later
The integration points are marked with `TODO(real API)`:
- `src/lib/providers/flights.ts` — map your provider (Amadeus / Aviationstack / AeroDataBox) into `FlightItinerary[]`.
- `src/lib/providers/flightStatus.ts` — look up by flight number + date.
- `src/lib/providers/geoIntel.ts` — already calls Claude with the `web_search` tool when `ANTHROPIC_API_KEY` is set.

> ⚠️ **Confirmation codes:** public flight-status APIs key off **flight number + date**, not airline
> confirmation/PNR codes (those require airline login). The conf-code field works in demo mode and
> is labelled accordingly.

## Configuring danger zones
Edit `src/lib/dangerZones.ts`. Each zone is a coarse `[lng, lat]` outline; the router treats every
`avoid` zone as a no-fly area and reroutes around it.

## Tech
Next.js 15 (App Router) · React 19 · TypeScript · Leaflet + OpenStreetMap · Turf.js (geometry) ·
Anthropic SDK. Access gate via Next.js middleware.

## Project layout
```
src/
  middleware.ts                 # optional username/password gate
  app/
    page.tsx                    # UI: planner, map, risk, flights, status
    api/{route,zones,flights,flight-status,geo-intel}/route.ts
  components/MapView.tsx         # Leaflet map (client-only)
  lib/
    geo.ts                      # great-circle, intersection, avoidance reroute
    dangerZones.ts              # configurable no-fly polygons (Iran default)
    geocode.ts                  # OpenStreetMap Nominatim
    providers/                  # flights, flightStatus, geoIntel (mock + real seam)
    config.ts, types.ts
```

## Disclaimer
Airspace polygons and reroutes here are **approximate** and **not for operational flight
planning**. Always rely on official NOTAMs and your airline.
