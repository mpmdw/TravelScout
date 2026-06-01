import { NextResponse } from "next/server";
import { geocode } from "@/lib/geocode";
import { planRoute } from "@/lib/geo";
import { DANGER_ZONES } from "@/lib/dangerZones";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { origin?: string; destination?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const originQ = (body.origin || "").trim();
  const destQ = (body.destination || "").trim();
  if (!originQ || !destQ) {
    return NextResponse.json(
      { error: "Provide both an origin and a destination." },
      { status: 400 },
    );
  }

  const [origin, destination] = await Promise.all([
    geocode(originQ),
    geocode(destQ),
  ]);
  if (!origin) {
    return NextResponse.json(
      { error: `Couldn't find a location for "${originQ}".` },
      { status: 404 },
    );
  }
  if (!destination) {
    return NextResponse.json(
      { error: `Couldn't find a location for "${destQ}".` },
      { status: 404 },
    );
  }

  const route = planRoute(origin, destination, DANGER_ZONES);
  return NextResponse.json({ route });
}
