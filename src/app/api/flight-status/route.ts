import { NextResponse } from "next/server";
import { getFlightStatus } from "@/lib/providers/flightStatus";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const flightNumber = searchParams.get("flightNumber") || undefined;
  const date = searchParams.get("date") || undefined;
  const confirmationRef = searchParams.get("conf") || undefined;

  if (!flightNumber && !confirmationRef) {
    return NextResponse.json(
      { error: "Provide a flight number (and date), or a confirmation code." },
      { status: 400 },
    );
  }

  const result = await getFlightStatus({ flightNumber, date, confirmationRef });
  return NextResponse.json(result);
}
