import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const tenantId = user.tenantId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};
    if (user.role !== "SUPERADMIN" && tenantId) {
      whereClause.branch = { tenantId };
    }
    if (branchId && branchId !== "all") {
      whereClause.branchId = branchId;
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        category: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const totalTickets = tickets.length;
    const completedTickets = tickets.filter((t) => t.status === "COMPLETED");
    const noShowTickets = tickets.filter((t) => t.status === "NO_SHOW");

    // 1. Kira Purata Masa Menunggu & Layanan (Minit)
    let totalWaitMs = 0;
    let validWaitCount = 0;
    let totalServMs = 0;
    let validServCount = 0;
    let slaPassedCount = 0;

    completedTickets.forEach((t) => {
      if (t.calledAt && t.createdAt) {
        const waitMs = new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime();
        if (waitMs >= 0) {
          totalWaitMs += waitMs;
          validWaitCount++;
          if (waitMs <= 15 * 60 * 1000) {
            slaPassedCount++;
          }
        }
      }

      if (t.completedAt && t.calledAt) {
        const servMs = new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime();
        if (servMs >= 0) {
          totalServMs += servMs;
          validServCount++;
        }
      }
    });

    const avgWaitMinutes = validWaitCount > 0 ? (totalWaitMs / validWaitCount / 60000).toFixed(1) : "0.0";
    const avgServiceMinutes = validServCount > 0 ? (totalServMs / validServCount / 60000).toFixed(1) : "0.0";
    const slaRate = completedTickets.length > 0 ? Math.round((slaPassedCount / completedTickets.length) * 100) : 100;
    const noShowRate = totalTickets > 0 ? Math.round((noShowTickets.length / totalTickets) * 100) : 0;

    // 2. Taburan Waktu Puncak (Hourly)
    const hourlyMap: Record<string, number> = {
      "08:00": 0, "09:00": 0, "10:00": 0, "11:00": 0,
      "12:00": 0, "13:00": 0, "14:00": 0, "15:00": 0,
      "16:00": 0, "17:00": 0,
    };

    tickets.forEach((t) => {
      const hour = new Date(t.createdAt).getHours();
      const hourKey = `${hour < 10 ? "0" + hour : hour}:00`;
      if (hourlyMap[hourKey] !== undefined) {
        hourlyMap[hourKey]++;
      }
    });

    const hourlyData = Object.entries(hourlyMap).map(([hour, count]) => ({
      hour,
      count,
    }));

    // 3. Pecahan Mengikut Kategori
    const categoryMap: Record<string, number> = {};
    tickets.forEach((t) => {
      const name = t.category?.name || "Lain-lain";
      categoryMap[name] = (categoryMap[name] || 0) + 1;
    });

    const categoryData = Object.entries(categoryMap).map(([name, count]) => ({
      name,
      count,
    }));

    // 4. Prestasi Staf Kaunter
    const staffMap: Record<string, { name: string; servedCount: number; totalServMs: number }> = {};
    completedTickets.forEach((t) => {
      const staffKey = t.calledByUserId || t.counterNo || "Kaunter 1";
      if (!staffMap[staffKey]) {
        staffMap[staffKey] = {
          name: t.counterNo ? `Kaunter ${t.counterNo}` : "Staf Bertugas",
          servedCount: 0,
          totalServMs: 0,
        };
      }
      staffMap[staffKey].servedCount++;
      if (t.completedAt && t.calledAt) {
        const servMs = new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime();
        if (servMs >= 0) {
          staffMap[staffKey].totalServMs += servMs;
        }
      }
    });

    const staffPerformance = Object.values(staffMap).map((s) => ({
      name: s.name,
      servedCount: s.servedCount,
      avgServiceMinutes: s.servedCount > 0 ? (s.totalServMs / s.servedCount / 60000).toFixed(1) : "0.0",
    }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalTickets,
          completedTickets: completedTickets.length,
          noShowTickets: noShowTickets.length,
          avgWaitMinutes,
          avgServiceMinutes,
          slaRate,
          noShowRate,
        },
        hourlyData,
        categoryData,
        staffPerformance,
      },
    });
  } catch (error) {
    console.error("[Analytics API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menjana data analisis." },
      { status: 500 }
    );
  }
}
