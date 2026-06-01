import { NextResponse } from "next/server";
import { DANGER_ZONES } from "@/lib/dangerZones";

// All configured danger zones, for the map to shade.
export async function GET() {
  return NextResponse.json({ zones: DANGER_ZONES });
}
