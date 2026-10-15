import { NextRequest, NextResponse } from "next/server";

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

    const data = await res.json();

    const results = data.map((item: any) => ({
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
  } catch (error: any) {
    console.error("[Geocoding Search Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Ralat pelayan carian lokasi." },
      { status: 500 }
    );
  }
}
