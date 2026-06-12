# HANDOFF — resume here next session

> Last updated: 2026-06-12 · baseline commit at time of writing: `55302e2` + the specs
> commit that contains this file. Audience: the next Claude session (or human) picking
> this project up cold.

## Where the project stands

- **App state**: working shadow-mode prototype + one real integration. Next.js 15 +
  TypeScript; five API routes; map with heuristic single-waypoint airspace avoidance;
  **Amadeus live flight search merged (P1.1 ✅)**; everything else mock-with-live-seams.
  No tests, no lint config, build-only CI, HTTP Basic auth gate, not deployed.
- **Planning state**: the roadmap (`docs/ROADMAP.md`) has been fully decomposed into
  **15 agent-native execution specs** in [`docs/specs/`](specs/README.md) — one per open
  task, each self-contained (context with `file:line` cites, pre-made design decisions,
  step-by-step plan, acceptance criteria, keyless verification commands).
- **Nothing beyond docs has changed** since commit `55302e2` — no source edits, no new
  dependencies.

## How to resume (protocol)

1. Read [`docs/specs/README.md`](specs/README.md) — the agent contract, the 7 global
   invariants (G1–G7), the wave plan, and merge-order notes. **Do not start a task
   without it.**
2. Pick the next task (see "Recommended order" below). Verify its spec's *Context*
   section against the current tree first — specs cite line numbers as of 2026-06-09 and
   the code may have drifted.
3. One task = one branch (`feat/<task-id>-<slug>`) = one PR. Run the spec's §7
   Verification verbatim before opening the PR. Tick the roadmap box + flip the spec's
   Status to `done` in the same PR.

## Recommended order

**Start with P2.4 (test suite)** — it unblocks P2.3 and P4.2 and gives every later task
a regression net. Then the rest of Wave 1 in any order / in parallel:

| Wave | Tasks | Notes |
|---|---|---|
| 1 | **P2.4**, P1.2, P1.3, P1.4, P2.1, P5.2 | all independent today; if P2.1 runs concurrently with P1.2/P1.3, merge the provider PRs first (P2.1 rewrites all routes — rebase it) |
| 2 | P2.2, P2.3, P4.2, P3.1 → P3.2 | P2.2 needs P1.2+P1.3 merged; P2.3 needs P2.4; P3.1 strictly before P3.2 (both touch middleware) |
| 3 | P5.1 | after Phases 1–2 |
| 4 | P4.1 | needs Phases 1–3 + **human** (Vercel account) |
| 5 | P4.3, P5.3 | P4.3 after P4.1; P5.3 absolute last |

## Human-procurable items (can be gathered any time, in parallel with agent work)

None block code: every spec implements + verifies keyless (shadow mode). Live-path
verification needs:

- **AeroDataBox key via RapidAPI** → `FLIGHT_STATUS_API_KEY` (P1.2)
- **Anthropic API key** → `ANTHROPIC_API_KEY` (P1.3 live verification)
- **Vercel account** + repo import + dashboard env vars (P4.1)
- **Sentry project/DSN** → `SENTRY_DSN` (P4.3, optional half)
- A real contact email/URL for `NOMINATIM_CONTACT` (P2.2)

## Repo operations facts (trip-wires for a fresh session)

- Folder `FlightChecker/` = private GitHub repo **`mpmdw/TravelScout`** (name mismatch is
  intentional). Push over **SSH** (`git@github.com:mpmdw/TravelScout.git`); the **`gh`
  CLI is NOT authenticated** — no `gh pr create`; open PRs via the GitHub web UI, or
  commit to a branch and tell the user.
- `npm run lint` is a **trap** until P4.2: the script exists but no ESLint config/deps do
  — it launches an interactive wizard. Don't run it in automation before P4.2 lands.
- `npm run build` is the only quality gate today (type-checks too); CI mirrors it.
- Known latent issues are deliberately **assigned to tasks** — don't fix opportunistically,
  the specs own them: placeholder Nominatim contact UA (`geocode.ts:20` → P2.2), silent
  flights/intel fetch failures in `page.tsx` → P5.1, uncapped `region` string into the
  Claude prompt → P2.1, comment saying `FLIGHT_API_KEY` instead of
  `FLIGHT_STATUS_API_KEY` (`flightStatus.ts:22` → P1.2).

## Decisions already made — do not re-litigate (rationale in each spec's §4)

AeroDataBox for flight status (P1.2) · keep trailing-JSON contract + robust extractor,
25s/attempt + 35s wall-guard timeouts (P1.3) · VATSpy-sourced Tehran FIR GeoJSON with
provenance file (P1.4) · zod + `{ error, details }` envelope (P2.1) · visibility graph +
Dijkstra with km-based buffers (P2.3) · Vitest, node env, flat `tests/` (P2.4) ·
HMAC-signed session cookie on Web Crypto, keep `BASIC_AUTH_*` var names + new
`AUTH_SECRET` (P3.1) · CSP without nonces, headers via `next.config.mjs` (P3.2) · Vercel
Git integration deploys, Actions only gates (P4.1/P4.2) · server-only Sentry behind
`SENTRY_DSN` (P4.3) · **Photon, not Nominatim, for autocomplete** — Nominatim's policy
forbids autocomplete (P5.1).

## State of this handoff's own session

- Specs authored 2026-06-09, reviewed + 4 defects fixed 2026-06-12 (timeout arithmetic in
  p1.3/p4.1, missing file in p1.2's table, unverified test pair in p2.3), committed with
  this file.
- Nothing in flight, no branches open, no uncommitted work expected after the commit
  containing this file.
