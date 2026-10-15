import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q") || "";
    const tenantSlug = searchParams.get("tenant") || "";

    const whereClause: any = {
      status: "ACTIVE",
      tenant: {
        status: "ACTIVE",
      },
    };

    if (tenantSlug) {
      whereClause.tenant.slug = tenantSlug;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { tenant: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    const branches = await prisma.branch.findMany({
      where: whereClause,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            settings: true,
          },
        },
        categories: {
          where: { status: "ACTIVE" },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            prefixCode: true,
            startNumber: true,
            estimatedMinutes: true,
          },
        },
      },
      orderBy: [{ tenant: { name: "asc" } }, { name: "asc" }],
    });

    // Kira jumlah barisan menunggu semasa bagi setiap cawangan
    const branchesWithQueue = await Promise.all(
      branches.map(async (b) => {
        const waitingCount = await prisma.ticket.count({
          where: {
            branchId: b.id,
            status: "WAITING",
          },
        });

        const activeCounters = await prisma.counter.count({
          where: {
            branchId: b.id,
            status: "OPEN",
          },
        });

        return {
          id: b.id,
          name: b.name,
          code: b.code,
          address: b.address,
          phone: b.phone,
          latitude: b.latitude,
          longitude: b.longitude,
          operatingHours: (b.settings as any)?.operatingHours || "08:30 - 17:00",
          tenant: {
            id: b.tenant.id,
            name: b.tenant.name,
            slug: b.tenant.slug,
          },
          categories: b.categories,
          liveQueue: {
            waitingCount,
            activeCounters,
            status: activeCounters > 0 ? "OPEN" : "WAITING_STAFF",
          },
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: branchesWithQueue.length,
      branches: branchesWithQueue,
    });
  } catch (error) {
    console.error("[Directory API Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat semasa memuat turun direktori cawangan." },
      { status: 500 }
    );
  }
}
