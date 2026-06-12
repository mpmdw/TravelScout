# TravelScout — Development Roadmap

A staged plan to take TravelScout from a working **shadow-mode prototype** to a **real, shipped
product**. It's organized into phases, each broken into **PR-sized tasks** that an AI agent (or a
future session) can pick up and execute one at a time.

**Current baseline:** Next.js 15 + TypeScript app; API routes `/api/{route,zones,flights,flight-status,geo-intel}`;
map + heuristic single-waypoint airspace avoidance; **mock** flights/status; Claude web-search path
present but not yet exercised with a real key; optional HTTP Basic auth gate; no tests / CI / deploy.

---

## Working this roadmap (for agents)

- **Each task has a full execution spec in [`docs/specs/`](specs/README.md)** — context,
  pre-made design decisions, step-by-step plan, acceptance criteria, and verification
  commands. Start there: read [`specs/README.md`](specs/README.md) (conventions + staged
  waves), then the task's spec.
- **One task = one branch/PR**, named `feat/<task-id>-<slug>` (e.g. `feat/p1.1-amadeus-flights`).
- **Preserve shadow mode**: every feature must keep working on mock data when its key is absent.
- Each task lists **Goal / Touch / Done / After**:
  - **Goal** — the outcome. **Touch** — files to change. **Done** — acceptance criteria. **After** — prerequisite tasks.
- **Before opening a PR**: `npm run build` passes and any new tests pass; **no secrets committed**.
- When adding an env var, update **both** `.env.example` **and** the README config table.
- Keep the **disclaimers** intact (airspace polygons are approximate; PNR/confirmation codes can't be
  resolved by public APIs — status uses flight # + date).
- Tick the box when a task merges.

---

## Phase 1 — Real data integrations  *(the core of "make it real")*

- [x] **P1.1 — Real flight-search adapter** ✅ *(Amadeus; merged)*
  - **Goal:** Live itineraries from a real provider (**Amadeus** recommended; Aviationstack / AeroDataBox as alternatives).
  - **Touch:** `src/lib/providers/flights.ts`, `src/lib/config.ts`, `.env.example`.
  - **Done:** With `FLIGHT_API_KEY` set, `/api/flights` returns live results mapped into `FlightItinerary[]`; falls back to mock when absent; per-(origin,destination) in-memory cache; provider/network errors degrade gracefully to mock with a `note`.
  - **After:** —

- [ ] **P1.2 — Real flight-status adapter**
  - **Goal:** Live status by flight number + date (AeroDataBox / FlightAware / Aviationstack).
  - **Touch:** `src/lib/providers/flightStatus.ts` (reuse the client/config from P1.1).
  - **Done:** Live status with a key; mock fallback without; the confirmation-code "PNR not supported by public APIs" note is preserved.
  - **After:** P1.1

- [ ] **P1.3 — Harden the Claude geo-intel live path**
  - **Goal:** Verify the `web_search` path against a real key; tune the prompt; reliably collect citations/sources; handle tool-use + timeout errors; cache per region with a TTL.
  - **Touch:** `src/lib/providers/geoIntel.ts`.
  - **Done:** With `ANTHROPIC_API_KEY`, returns a live, cited assessment; JSON extraction is robust to formatting; results cached for N minutes; clean fallback to mock on error.
  - **After:** —

- [ ] **P1.4 — Real airspace data**
  - **Goal:** Replace the approximate Iran polygon with a **sourced FIR boundary** GeoJSON; structure the data so closures/advisories can be ingested later.
  - **Touch:** `src/lib/dangerZones.ts`, new `data/` directory.
  - **Done:** Zones load from a real, documented FIR dataset; the list stays user-configurable; the "approximate / not for operational use" disclaimer remains.
  - **After:** —

## Phase 2 — Reliability, correctness & tests

- [ ] **P2.1 — Input validation + error envelope**
  - **Goal:** Validate every API route with `zod`; return a standardized error shape.
  - **Touch:** all `src/app/api/**/route.ts`, new `src/lib/validation.ts`.
  - **Done:** Invalid input → `400` with a consistent `{ error, details }` shape; the UI surfaces friendly messages.
  - **After:** —

- [ ] **P2.2 — Caching + rate-limit/backoff for external calls**
  - **Goal:** Cache geocode / flights / intel results; respect the Nominatim usage policy; back off on `429`.
  - **Touch:** `src/lib/geocode.ts`, providers, a small cache utility.
  - **Done:** Repeated identical requests are served from cache; no policy violations under light load; transient `429`s retried with backoff.
  - **After:** P1.1–P1.3

- [ ] **P2.3 — Stronger avoidance algorithm**
  - **Goal:** Replace the single-waypoint north/south heuristic with a multi-waypoint detour that clears **all** zones; handle antimeridian and high-latitude edge cases.
  - **Touch:** `src/lib/geo.ts`.
  - **Done:** Tests across several crossing pairs all clear every zone with a reasonable added distance.
  - **After:** P2.4

- [ ] **P2.4 — Test suite (Vitest)**
  - **Goal:** Unit + regression tests.
  - **Touch:** `tests/`, `vitest.config.ts`, `package.json` (test script).
  - **Done:** `npm test` is green and **includes a regression test for the fixed flight-status signed-shift bug** (`>>` → `>>>`) plus avoidance-correctness tests.
  - **After:** —

## Phase 3 — Auth & security hardening

- [ ] **P3.1 — Productionize the access gate**
  - **Goal:** Move from shared HTTP Basic Auth to a signed-session login (hashed password, login page, logout) — or, if keeping Basic, add lockout / rate-limiting.
  - **Touch:** `src/middleware.ts`, a new auth lib, optional login page.
  - **Done:** Secure session handling; brute-force protection; still simple to share with one friend.
  - **After:** —

- [ ] **P3.2 — Security headers + secret hygiene**
  - **Goal:** Add CSP and standard security headers; confirm no API key reaches the client bundle.
  - **Touch:** `next.config.mjs` (headers), middleware.
  - **Done:** Security headers present in responses; keys verified server-only.
  - **After:** —

## Phase 4 — Deploy, CI/CD & observability

- [ ] **P4.1 — Deploy to Vercel**
  - **Goal:** Production + preview deploys with env vars configured; auth verified in production.
  - **Touch:** optional `vercel.json`, README deploy section.
  - **Done:** Live HTTPS URL serving the app behind the gate.
  - **After:** Phases 1–3

- [ ] **P4.2 — GitHub Actions CI/CD**
  - **Goal:** A workflow that runs lint + typecheck + test + build on every PR, and deploys on merge to `main`.
  - **Touch:** `.github/workflows/ci.yml`.
  - **Done:** CI is green on PRs; merges to `main` deploy. *(Note: needs `gh auth login` or web setup — the `gh` CLI is not currently authenticated; git push uses SSH.)*
  - **After:** P2.4

- [ ] **P4.3 — Observability**
  - **Goal:** Error tracking (e.g. Sentry), structured logging, and a `/api/health` endpoint.
  - **Touch:** new health route, instrumentation hooks.
  - **Done:** Errors are captured centrally; health check returns ok.
  - **After:** P4.1

## Phase 5 — UX polish & launch

- [ ] **P5.1 — States, a11y, mobile, autocomplete**
  - **Goal:** Proper loading/empty/error states; accessibility pass; solid mobile layout; location autocomplete on the inputs.
  - **Touch:** `src/app/page.tsx`, components.
  - **Done:** a11y checks pass; mobile layout verified; inputs autocomplete locations.
  - **After:** Phases 1–2

- [ ] **P5.2 — Map polish**
  - **Goal:** Clearer danger-zone styling, route highlighting, an on-map legend, and richer popups.
  - **Touch:** `src/components/MapView.tsx`.
  - **Done:** Visualization is clearer and more informative.
  - **After:** —

- [ ] **P5.3 — Docs + demo**
  - **Goal:** Refresh the README, add screenshots/GIF, and a short demo script/walkthrough.
  - **Touch:** `README.md`, `docs/`.
  - **Done:** Docs reflect the shipped app; the demo is reproducible.
  - **After:** most phases

---

## Critical path & sequencing
- **Critical path:** P1.1 → P1.2, P2.4 → P2.3, then Phase 3 → P4.1 → P4.2 → launch.
- **Parallelizable:** P1.3, P1.4, and the Phase 5 polish tasks can proceed independently.

## Future / out of scope (not yet sequenced)
User accounts & saved trips · email/push alerts on cancellations · multiple live conflict zones from a
feed (auto-updating) · native/mobile app.

---

*Part of [TravelScout](../README.md). Airspace data and reroutes are approximate and not for operational flight planning.*
