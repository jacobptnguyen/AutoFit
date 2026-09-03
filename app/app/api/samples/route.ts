import { NextResponse } from "next/server";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";

export async function GET() {
  try {
    const upstream = await fetch(`${ML_SERVICE_URL}/api/samples`, { cache: "no-store" });
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch {
    return NextResponse.json({ error: "Could not reach the analysis service" }, { status: 502 });
  }
}
