// Server-side configuration + "shadow mode" feature flags.
// These read process.env at call time so .env.local / Vercel env vars work.

export function getConfig() {
  return {
    // Claude (Anthropic)
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",

    // Flight SEARCH — Amadeus Self-Service (OAuth2 client credentials)
    amadeusClientId: process.env.AMADEUS_CLIENT_ID || "",
    amadeusClientSecret: process.env.AMADEUS_CLIENT_SECRET || "",
    amadeusHostname: process.env.AMADEUS_HOSTNAME || "test.api.amadeus.com",

    // Flight STATUS provider (wired in P1.2)
    flightStatusApiKey: process.env.FLIGHT_STATUS_API_KEY || "",
  };
}

/** True when a real Claude key is present (otherwise geo-intel uses mock data). */
export const hasClaude = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

/** Live flight SEARCH (Amadeus) requires BOTH a client id and secret. */
export const hasFlightSearch = (): boolean =>
  Boolean(process.env.AMADEUS_CLIENT_ID && process.env.AMADEUS_CLIENT_SECRET);

/** Live flight STATUS provider key (wired in P1.2). */
export const hasFlightStatus = (): boolean =>
  Boolean(process.env.FLIGHT_STATUS_API_KEY);
