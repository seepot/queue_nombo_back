import { NextRequest, NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { enforceIpRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const limited = await enforceIpRateLimit(req, "devices-request-pin", 20, 60);
    if (limited) return limited;

    const body = await req.json();
    const { deviceUid, deviceName = "Paparan Skrin TV", deviceType = "TV_DISPLAY" } = body;

    if (!deviceUid) {
      return NextResponse.json(
        { success: false, message: "deviceUid diperlukan" },
        { status: 400 }
      );
    }

    // 1. Semak jika peranti ini sudah berdaftar & dipasangkan dalam DB
    const existingDevice = await prisma.device.findUnique({
      where: { deviceUid },
      include: {
        branch: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (existingDevice && existingDevice.isPaired && existingDevice.branch) {
      return NextResponse.json({
        success: true,
        isPaired: true,
        device: {
          id: existingDevice.id,
          deviceUid: existingDevice.deviceUid,
          deviceName: existingDevice.deviceName,
          branchId: existingDevice.branchId,
          branchName: existingDevice.branch.name,
          tenantId: existingDevice.branch.tenantId,
          tenantName: existingDevice.branch.tenant.name,
          tenantSlug: existingDevice.branch.tenant.slug,
        },
      });
    }

    // 2. Jana kod PIN 6-digit rawak (cth: 749102)
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const pinKey = `device:pairing:pin:${pin}`;
    const ttlSeconds = 600; // 10 minit

    const payload = JSON.stringify({
      deviceUid,
      deviceName,
      deviceType,
      ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
      createdAt: new Date().toISOString(),
    });

    await redis.set(pinKey, payload, "EX", ttlSeconds);

    // Pastikan rekod peranti wujud atau dikemas kini dengan PIN
    await prisma.device.upsert({
      where: { deviceUid },
      create: {
        deviceUid,
        deviceName,
        deviceType,
        pairingCode: pin,
        pairingExpires: new Date(Date.now() + ttlSeconds * 1000),
        isPaired: false,
        ipAddress: req.headers.get("x-forwarded-for") || null,
      },
      update: {
        pairingCode: pin,
        pairingExpires: new Date(Date.now() + ttlSeconds * 1000),
        isPaired: false,
        lastHeartbeat: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      isPaired: false,
      pairing: {
        pin,
        formattedPin: `${pin.slice(0, 3)}-${pin.slice(3)}`,
        expiresInSeconds: ttlSeconds,
        expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
        deviceUid,
      },
    });
  } catch (error) {
    console.error("[Device Request-PIN Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat pelayan semasa menjana kod PIN peranti" },
      { status: 500 }
    );
  }
}
