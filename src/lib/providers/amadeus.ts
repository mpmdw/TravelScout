import { getConfig } from "../config";

/**
 * Minimal Amadeus Self-Service client — just the pieces TravelScout needs:
 * OAuth2 client-credentials token (cached until expiry), nearest-airport
 * lookup (we already have geocoded lat/lng), and flight-offers search.
 *
 * Docs: https://developers.amadeus.com/  (free test environment).
 */

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  const { amadeusClientId, amadeusClientSecret, amadeusHostname } = getConfig();
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now + 60_000) return tokenCache.token;

  const res = await fetch(`https://${amadeusHostname}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: amadeusClientId,
      client_secret: amadeusClientSecret,
    }),
  });
  if (!res.ok) throw new Error(`Amadeus auth failed (HTTP ${res.status})`);

  const data = (await res.json()) as { access_token: string; expires_in?: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 1800) * 1000,
  };
  return tokenCache.token;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function amadeusGet(path: string, params: Record<string, string>): Promise<any> {
  const { amadeusHostname } = getConfig();
  const token = await getToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://${amadeusHostname}${path}?${qs}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Amadeus ${path} failed (HTTP ${res.status}) ${body.slice(0, 160)}`);
  }
  return res.json();
}

/** Nearest airport IATA code for a coordinate (uses our geocoded lat/lng). */
export async function nearestAirportCode(lat: number, lng: number): Promise<string | null> {
  try {
    const data = await amadeusGet("/v1/reference-data/locations/airports", {
      latitude: lat.toFixed(4),
      longitude: lng.toFixed(4),
      sort: "distance",
      "page[limit]": "1",
    });
    return data?.data?.[0]?.iataCode ?? null;
  } catch {
    return null;
  }
}

export interface OffersResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  offers: any[];
  carriers: Record<string, string>;
}

/** One-way flight offers between two IATA codes on a date. */
export async function searchFlightOffers(
  originCode: string,
  destinationCode: string,
  departureDate: string,
  max = 6,
): Promise<OffersResult> {
  const data = await amadeusGet("/v2/shopping/flight-offers", {
    originLocationCode: originCode,
    destinationLocationCode: destinationCode,
    departureDate,
    adults: "1",
    currencyCode: "USD",
    max: String(max),
  });
  return {
    offers: Array.isArray(data?.data) ? data.data : [],
    carriers: data?.dictionaries?.carriers ?? {},
  };
}
