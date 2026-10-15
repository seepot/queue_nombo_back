import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Sila log masuk terlebih dahulu." },
        { status: 401 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session.user as any;
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const tenantId = user.tenantId;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {};
    if (user.role !== "SUPERADMIN" && tenantId) {
      whereClause.branch = { tenantId };
    }
    if (branchId && branchId !== "all") {
      whereClause.branchId = branchId;
    }
    if (startDateParam && endDateParam) {
      whereClause.createdAt = {
        gte: new Date(`${startDateParam}T00:00:00.000Z`),
        lte: new Date(`${endDateParam}T23:59:59.999Z`),
      };
    }

    const tickets = await prisma.ticket.findMany({
      where: whereClause,
      include: {
        category: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    // Bina kandungan fail CSV
    const headers = [
      "No Tiket",
      "Kategori Urusan",
      "Cawangan",
      "Kaunter",
      "Status",
      "Masa Diambil",
      "Masa Dipanggil",
      "Masa Selesai",
      "Masa Menunggu (Minit)",
      "Masa Layanan (Minit)",
      "Nama Pelanggan",
      "No Telefon",
    ];

    const rows = tickets.map((t) => {
      const waitMin =
        t.calledAt && t.createdAt
          ? ((new Date(t.calledAt).getTime() - new Date(t.createdAt).getTime()) / 60000).toFixed(1)
          : "-";

      const servMin =
        t.completedAt && t.calledAt
          ? ((new Date(t.completedAt).getTime() - new Date(t.calledAt).getTime()) / 60000).toFixed(1)
          : "-";

      return [
        `"${t.ticketNo}"`,
        `"${t.category?.name || "-"}"`,
        `"${t.branch?.name || "-"}"`,
        `"${t.counterNo ? "Kaunter " + t.counterNo : "-"}"`,
        `"${t.status}"`,
        `"${t.createdAt.toISOString().replace("T", " ").substring(0, 19)}"`,
        `"${t.calledAt ? t.calledAt.toISOString().replace("T", " ").substring(0, 19) : "-"}"`,
        `"${t.completedAt ? t.completedAt.toISOString().replace("T", " ").substring(0, 19) : "-"}"`,
        `"${waitMin}"`,
        `"${servMin}"`,
        `"${t.customerName || "-"}"`,
        `"${t.phoneNo || "-"}"`,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan_quenombo_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error("[CSV Export Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat semasa mengeksport laporan CSV." },
      { status: 500 }
    );
  }
}
