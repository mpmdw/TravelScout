import { NextResponse } from "next/server";
import { getGeoIntel } from "@/lib/providers/geoIntel";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // live web search can take a little while

export async function POST(req: Request) {
  let body: { region?: string };
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const region = (body.region || "").trim() || "Iran and nearby airspace";
  const intel = await getGeoIntel(region);
  return NextResponse.json({ intel });
}
