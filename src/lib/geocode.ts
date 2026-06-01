import { Place } from "./types";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/**
 * Resolve a free-text location to coordinates via OpenStreetMap Nominatim.
 * No API key required. Runs server-side (a descriptive User-Agent is required
 * by Nominatim's usage policy). Returns null when nothing is found.
 */
export async function geocode(query: string): Promise<Place | null> {
  const q = query.trim();
  if (!q) return null;

  const url =
    `${NOMINATIM}?q=${encodeURIComponent(q)}` +
    `&format=jsonv2&limit=1&addressdetails=0`;

  const res = await fetch(url, {
    headers: {
      "User-Agent": "TravelScout/0.1 (personal project; contact: set-your-email)",
      "Accept-Language": "en",
    },
    // Be polite to the free endpoint.
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!data || data.length === 0) return null;

  const top = data[0];
  return {
    query: q,
    name: top.display_name,
    lat: parseFloat(top.lat),
    lng: parseFloat(top.lon),
  };
}
