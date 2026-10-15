import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // 1. Semak kebenaran pentadbir (Auth Check)
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Akses tidak dibenarkan. Sila log masuk." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { pin, branchId, deviceName } = body;

    if (!pin || !branchId) {
      return NextResponse.json(
        { success: false, message: "Kod PIN dan branchId diperlukan" },
        { status: 400 }
      );
    }

    // Bersihkan format PIN jika ada tanda sengkang (cth: "749-102" -> "749102")
    const cleanPin = pin.replace(/\D/g, "");
    const pinKey = `device:pairing:pin:${cleanPin}`;

    // 2. Semak data PIN dari Redis
    const pinDataRaw = await redis.get(pinKey);
    if (!pinDataRaw) {
      return NextResponse.json(
        { success: false, message: "Kod PIN tidak sah atau telah luput. Sila muat semula skrin TV." },
        { status: 400 }
      );
    }

    const pinData = JSON.parse(pinDataRaw);
    const deviceUid = pinData.deviceUid;

    // 3. Sahkan kewujudan cawangan dan hak milik tenant
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });

    if (!branch) {
      return NextResponse.json(
        { success: false, message: "Cawangan tidak ditemui." },
        { status: 404 }
      );
    }

    // Semak jika pengguna mempunyai akses ke cawangan/tenant ini
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userRole = (session.user as any).role;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userTenantId = (session.user as any).tenantId;

    if (userRole !== "SUPERADMIN" && userTenantId && userTenantId !== branch.tenantId) {
      return NextResponse.json(
        { success: false, message: "Anda tiada kebenaran untuk cawangan ini." },
        { status: 403 }
      );
    }

    // 4. Kemas kini rekod peranti dalam pangkalan data PostgreSQL
    const updatedDevice = await prisma.device.upsert({
      where: { deviceUid },
      create: {
        deviceUid,
        deviceName: deviceName || pinData.deviceName || "Skrin TV Kaunter",
        deviceType: pinData.deviceType || "TV_DISPLAY",
        branchId: branch.id,
        isPaired: true,
        pairingCode: null,
        pairingExpires: null,
      },
      update: {
        branchId: branch.id,
        deviceName: deviceName || undefined,
        isPaired: true,
        pairingCode: null,
        pairingExpires: null,
        lastHeartbeat: new Date(),
      },
    });

    // 5. Hapus PIN daripada Redis (Single-use)
    await redis.del(pinKey);

    // 6. Simpan status pairing aktif ke Redis untuk peranti TV semak (<1ms)
    await redis.set(
      `device:paired:${deviceUid}`,
      JSON.stringify({
        isPaired: true,
        branchId: branch.id,
        branchName: branch.name,
        tenantId: branch.tenantId,
        tenantSlug: branch.tenant.slug,
        pairedAt: new Date().toISOString(),
      }),
      "EX",
      86400 * 30 // Simpan 30 hari
    );

    // 7. Pancarkan notifikasi realtime ke peranti TV
    const { broadcastToRealtime } = await import("@/lib/realtime");
    await broadcastToRealtime("publish/device-paired", {
      deviceUid: updatedDevice.deviceUid,
      branchId: branch.id,
      tenantId: branch.tenantId,
      isPaired: true,
    });

    return NextResponse.json({
      success: true,
      message: `Peranti '${updatedDevice.deviceName}' berjaya dipadankan dengan cawangan '${branch.name}'.`,
      device: {
        id: updatedDevice.id,
        deviceUid: updatedDevice.deviceUid,
        deviceName: updatedDevice.deviceName,
        branchId: branch.id,
        branchName: branch.name,
      },
    });
  } catch (error) {
    console.error("[Device Confirm-Pair Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa memadankan peranti" },
      { status: 500 }
    );
  }
}
