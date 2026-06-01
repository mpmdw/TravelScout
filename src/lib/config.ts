// Server-side configuration + "shadow mode" feature flags.
// These read process.env at call time so .env.local / Vercel env vars work.

export function getConfig() {
  return {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",
    anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
    flightApiKey: process.env.FLIGHT_API_KEY || "",
    flightApiBase: process.env.FLIGHT_API_BASE || "",
  };
}

/** True when a real Claude key is present (otherwise geo-intel uses mock data). */
export const hasClaude = (): boolean => Boolean(process.env.ANTHROPIC_API_KEY);

/** True when a real flight API key is present (otherwise flights use mock data). */
export const hasFlightApi = (): boolean => Boolean(process.env.FLIGHT_API_KEY);
