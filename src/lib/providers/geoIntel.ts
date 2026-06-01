import Anthropic from "@anthropic-ai/sdk";
import { GeoIntel, Heat } from "../types";
import { getConfig, hasClaude } from "../config";

/**
 * Geopolitical "heat" + airline-cancellation assessment for a region.
 *
 * With ANTHROPIC_API_KEY set, Claude performs live web search and returns a
 * cited assessment. Without a key (or on error), a clearly-labelled mock is
 * returned so the UI always works.
 */
export async function getGeoIntel(region: string): Promise<GeoIntel> {
  const r = region.trim() || "Iran and nearby airspace";
  if (!hasClaude()) return mockIntel(r);
  try {
    return await liveIntel(r);
  } catch (e) {
    const m = mockIntel(r);
    m.summary =
      `(Live lookup failed: ${(e as Error).message}. Showing mock data.) ` +
      m.summary;
    return m;
  }
}

async function liveIntel(region: string): Promise<GeoIntel> {
  const { anthropicApiKey, anthropicModel } = getConfig();
  const client = new Anthropic({ apiKey: anthropicApiKey });

  const prompt =
    `Using up-to-date web search, assess flight-relevant risk for: "${region}".\n` +
    `Cover: overall heat level, a one-line headline, a short summary (<=120 words), ` +
    `key airspace notes (closures / overflight advisories), and any notable airline ` +
    `cancellations or route suspensions.\n` +
    `Finish your reply with ONLY a JSON object on its own final line of this exact shape:\n` +
    `{"heat":"calm|elevated|high|severe","headline":"...","summary":"...",` +
    `"airspaceNotes":["..."],"airlineCancellations":["..."]}`;

  const resp = await client.messages.create({
    model: anthropicModel,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
    // Server-side web search tool (cast to avoid SDK tool-typing friction).
    tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }] as any,
  });

  let text = "";
  const sources: { title: string; url: string }[] = [];

  for (const block of resp.content as any[]) {
    if (block.type === "text") {
      text += block.text;
      for (const cit of block.citations || []) {
        if (cit?.url) sources.push({ title: cit.title || cit.url, url: cit.url });
      }
    } else if (block.type === "web_search_tool_result") {
      for (const item of block.content || []) {
        if (item?.url) sources.push({ title: item.title || item.url, url: item.url });
      }
    }
  }

  const parsed = extractJson(text);
  return {
    region,
    heat: normalizeHeat(parsed.heat),
    headline: String(parsed.headline || "Risk assessment"),
    summary: String(parsed.summary || text.slice(0, 600) || "No summary returned."),
    airspaceNotes: toStrArray(parsed.airspaceNotes),
    airlineCancellations: toStrArray(parsed.airlineCancellations),
    sources: dedupeSources(sources).slice(0, 8),
    generatedAt: new Date().toISOString(),
    source: "live",
  };
}

function extractJson(text: string): Record<string, unknown> {
  const start = text.lastIndexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return {};
}

function normalizeHeat(v: unknown): Heat {
  const s = String(v || "").toLowerCase();
  if (s === "calm" || s === "elevated" || s === "high" || s === "severe") return s;
  return "elevated";
}

function toStrArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x)).filter(Boolean).slice(0, 8);
  return [];
}

function dedupeSources(
  sources: { title: string; url: string }[],
): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const s of sources) {
    if (!seen.has(s.url)) {
      seen.add(s.url);
      out.push(s);
    }
  }
  return out;
}

function mockIntel(region: string): GeoIntel {
  return {
    region,
    heat: "high",
    headline: "Elevated risk — many carriers are routing around the area",
    summary:
      "Mock assessment (no ANTHROPIC_API_KEY set). Several airlines have been " +
      "avoiding the region due to conflict-related airspace advisories, adding " +
      "flight time on affected routes. Add a Claude API key to fetch a live, " +
      "web-searched assessment with cited sources.",
    airspaceNotes: [
      "Overflight advisories in effect for the region (mock).",
      "Expect longer routings as carriers detour around restricted airspace (mock).",
    ],
    airlineCancellations: [
      "Some carriers have suspended select routes to/over the area (mock example).",
    ],
    sources: [],
    generatedAt: new Date().toISOString(),
    source: "mock",
  };
}
