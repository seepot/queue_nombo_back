import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DEFAULT_PLATFORM_SETTINGS, readJsonObject, type PlatformSettings } from "@/lib/settings";

export async function GET() {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan." },
        { status: 403 }
      );
    }

    // Ambil log audit terakhir bagi tetapan platform
    const latestSettingLog = await prisma.auditLog.findFirst({
      where: { action: "PLATFORM_GLOBAL_SETTINGS_UPDATED" },
      orderBy: { createdAt: "desc" },
    });

    const settings = latestSettingLog?.details
      ? readJsonObject<PlatformSettings>(latestSettingLog.details)
      : DEFAULT_PLATFORM_SETTINGS;

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error("[Superadmin GET Platform Settings Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat mengambil tetapan platform." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { announcementBanner, announcementType, maintenanceMode } = body;

    const firstTenant = await prisma.tenant.findFirst();

    await prisma.auditLog.create({
      data: {
        tenantId: firstTenant?.id || "system",
        action: "PLATFORM_GLOBAL_SETTINGS_UPDATED",
        details: {
          announcementBanner: announcementBanner || "",
          announcementType: announcementType || "INFO",
          maintenanceMode: !!maintenanceMode,
          updatedBy: user.email || user.name || "Superadmin",
          updatedAt: new Date().toISOString(),
        },
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Tetapan global platform berjaya dikemas kini!",
    });
  } catch (error) {
    console.error("[Superadmin POST Platform Settings Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat menyimpan tetapan platform.") },
      { status: 500 }
    );
  }
}
