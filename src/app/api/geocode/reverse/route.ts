import { NextRequest, NextResponse } from "next/server";
import { getUserOr401 } from "@/lib/auth";
import { reverseGeocode } from "@/lib/geocoding/nominatim";

export async function GET(request: NextRequest) {
  const auth = await getUserOr401(request);
  if ("error" in auth) return auth.error;

  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lon = Number(request.nextUrl.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json({ error: "lat and lon required" }, { status: 400 });
  }

  const place = await reverseGeocode(lat, lon);
  if (!place) {
    return NextResponse.json({ error: "Could not resolve location" }, { status: 404 });
  }

  return NextResponse.json({
    place: {
      place_id: place.place_id,
      label: place.display_name,
      lat: place.lat,
      lon: place.lon,
      boundingbox: place.boundingbox,
    },
  });
}
