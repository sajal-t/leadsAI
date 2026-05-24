import { NextRequest, NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { searchPlaces } from "@/lib/geocoding/nominatim";

export async function GET(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchPlaces(q, 8);
  return NextResponse.json({ results });
}
