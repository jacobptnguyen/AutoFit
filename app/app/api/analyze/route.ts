import { NextResponse } from "next/server";

export const maxDuration = 60;

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:5001";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  let upstream: Response;

  try {
    if (contentType.includes("multipart/form-data")) {
      const incoming = await request.formData();
      const file = incoming.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      const outgoing = new FormData();
      outgoing.set("file", file, file.name);
      upstream = await fetch(`${ML_SERVICE_URL}/api/analyze`, {
        method: "POST",
        body: outgoing,
      });
    } else {
      const body = await request.json();
      upstream = await fetch(`${ML_SERVICE_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }
  } catch {
    return NextResponse.json({ error: "Could not reach the analysis service" }, { status: 502 });
  }

  const data = await upstream
    .json()
    .catch(() => ({ error: "Invalid response from the analysis service" }));
  return NextResponse.json(data, { status: upstream.status });
}
