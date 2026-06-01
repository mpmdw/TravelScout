import { NextResponse } from "next/server";
import { searchFlights } from "@/lib/providers/flights";
import { Place } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { origin?: Place; destination?: Place };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { origin, destination } = body;
  if (
    typeof origin?.lat !== "number" ||
    typeof destination?.lat !== "number"
  ) {
    return NextResponse.json(
      { error: "origin and destination Place objects (with lat/lng) are required." },
      { status: 400 },
    );
  }

  const result = await searchFlights(origin, destination);
  return NextResponse.json(result);
}
