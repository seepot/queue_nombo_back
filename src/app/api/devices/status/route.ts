import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonObject, type BranchSettings, type TenantSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const deviceUid = searchParams.get("deviceUid");

    if (!deviceUid) {
      return NextResponse.json(
        { success: false, message: "deviceUid diperlukan" },
        { status: 400 }
      );
    }

    // Semak status dalam PostgreSQL
    const device = await prisma.device.findUnique({
      where: { deviceUid },
      include: {
        branch: {
          include: {
            tenant: true,
            categories: {
              where: { status: "ACTIVE" },
              orderBy: { sortOrder: "asc" },
            },
            counters: {
              where: { status: "OPEN" },
              orderBy: { counterNo: "asc" },
            },
          },
        },
      },
    });

    if (!device || !device.isPaired || !device.branch) {
      return NextResponse.json({
        success: true,
        isPaired: false,
        pairingCode: device?.pairingCode || null,
        pairingExpires: device?.pairingExpires || null,
      });
    }

    // Kemas kini heartbeat masa nyata
    await prisma.device.update({
      where: { id: device.id },
      data: { lastHeartbeat: new Date() },
    });

    const branch = device.branch;
    const tenant = branch.tenant;
    const tenantSettings = readJsonObject<TenantSettings>(tenant.settings);
    const branchSettings = readJsonObject<BranchSettings>(branch.settings);

    return NextResponse.json({
      success: true,
      isPaired: true,
      device: {
        id: device.id,
        deviceUid: device.deviceUid,
        deviceName: device.deviceName,
        lastHeartbeat: device.lastHeartbeat,
      },
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        address: branch.address,
        categories: branch.categories.map((c) => ({
          id: c.id,
          name: c.name,
          prefixCode: c.prefixCode,
          startNumber: c.startNumber,
        })),
        counters: branch.counters.map((c) => ({
          id: c.id,
          counterNo: c.counterNo,
          name: c.name,
          zone: c.zone,
          status: c.status,
        })),
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        planType: tenant.planType,
      },
      displayConfig: {
        theme: tenantSettings.theme || "light",
        logoUrl: tenantSettings.logoUrl || null,
        youtubeUrl: branchSettings.youtubeUrl || tenantSettings.youtubeUrl || "https://www.youtube.com/embed/oe5HTPG7ksM",
        runningText: branchSettings.runningText || tenantSettings.runningText || `Selamat Datang ke ${branch.name} • Sila pastikan dokumen anda lengkap sebelum ke kaunter`,
        voiceLanguage: branchSettings.voiceLanguage || "ms-MY",
        realtimeChannel: `tenant:${tenant.id}:branch:${branch.id}`,
      },
    });
  } catch (error) {
    console.error("[Device Status Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menyemak status peranti" },
      { status: 500 }
    );
  }
}
