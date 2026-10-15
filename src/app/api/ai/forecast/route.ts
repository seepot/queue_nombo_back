import { NextRequest, NextResponse } from "next/server";
import { getCounterOptimizationRecommendations, getHourlyTrafficForecast } from "@/lib/ai-queue";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, message: "Akses tidak dibenarkan." }, { status: 401 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { success: false, message: "branchId diperlukan." },
        { status: 400 }
      );
    }

    if (user.role !== "SUPERADMIN") {
      const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { tenantId: true } });
      if (!branch || branch.tenantId !== user.tenantId) {
        return NextResponse.json({ success: false, message: "Cawangan tidak ditemui." }, { status: 404 });
      }
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
