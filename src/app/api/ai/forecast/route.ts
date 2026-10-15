import { NextRequest, NextResponse } from "next/server";
import { getCounterOptimizationRecommendations, getHourlyTrafficForecast } from "@/lib/ai-queue";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { success: false, message: "branchId diperlukan." },
        { status: 400 }
      );
    }

    const recommendations = await getCounterOptimizationRecommendations(branchId);
    const hourlyForecast = getHourlyTrafficForecast();

    return NextResponse.json({
      success: true,
      recommendations,
      hourlyForecast,
    });
  } catch (error) {
    console.error("[AI Forecast API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat semasa memproses ramalan AI." },
      { status: 500 }
    );
  }
}
