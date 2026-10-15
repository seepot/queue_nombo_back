import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";

/** Medan respons Nominatim yang digunakan. */
interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  type: string;
  class: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q");

    if (!query || !query.trim()) {
      return NextResponse.json({ success: false, results: [] });
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const osmUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedQuery}&countrycodes=my&limit=5&addressdetails=1`;

    const res = await fetch(osmUrl, {
      headers: {
        "User-Agent": "QueNombo-SaaS/1.0 (support@quenombo.com)",
        "Accept-Language": "ms,en",
      },
      // Cache 1 hour for fast repeat lookups
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Ralat daripada penyedia peta OpenStreetMap." },
        { status: res.status }
      );
    }

    const data: NominatimResult[] = await res.json();

    const results = data.map((item) => ({
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      type: item.type,
      class: item.class,
    }));

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("[Geocoding Search Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat pelayan carian lokasi.") },
      { status: 500 }
    );
  }
}
