import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get("branchId") || user.branchId;

  const devices = await prisma.device.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      deviceType: "TV_DISPLAY",
    },
    include: { branch: true },
  });

  const now = Date.now();
  const list = devices.map((d) => {
    const pingTime = d.lastHeartbeat ? new Date(d.lastHeartbeat).getTime() : 0;
    const diffSeconds = Math.max(0, Math.floor((now - pingTime) / 1000));
    let status: "online" | "warning" | "offline" = "online";
    if (diffSeconds > 120) {
      status = "offline";
    } else if (diffSeconds > 45) {
      status = "warning";
    }

    return {
      id: d.id,
      idCawangan: d.branch?.code || d.branchId || "DEMO",
      namaTv: d.deviceName,
      lokasi: d.branch?.name || "Lobi Utama",
      ipAddress: d.ipAddress,
      deviceInfo: d.deviceUid,
      lastPing: d.lastHeartbeat.toISOString(),
      secondsSinceLastPing: diffSeconds,
      status,
      currentTicket: null,
      statusRealtime: d.isPaired ? "PAIRED" : "UNPAIRED",
      appVersion: d.appVersion,
      pendingCommand: null,
    };
  });

  const onlineCount = list.filter((t) => t.status === "online").length;
  const warningCount = list.filter((t) => t.status === "warning").length;
  const offlineCount = list.filter((t) => t.status === "offline").length;

  return NextResponse.json({
    totalTv: list.length,
    onlineCount,
    warningCount,
    offlineCount,
    hasOfflineWarning: offlineCount > 0,
    list,
  });
}
