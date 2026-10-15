import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isWithinLastMs } from "@/lib/date";
import DeviceManagerClient from "./DeviceManagerClient";

export const metadata = {
  title: "Pengurusan Peranti TV & Kiosk | SmartQ Cloud",
};

export default async function PerantiPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = session.user as any;
  const userRole = user.role;
  const userTenantId = user.tenantId;

  // Dapatkan senarai cawangan yang boleh diakses pengguna
  const branches = await prisma.branch.findMany({
    where: {
      ...(userRole !== "SUPERADMIN" && userTenantId ? { tenantId: userTenantId } : {}),
    },
    select: {
      id: true,
      name: true,
      code: true,
    },
    orderBy: { name: "asc" },
  });

  // Dapatkan senarai peranti
  const branchIds = branches.map((b) => b.id);
  const rawDevices = await prisma.device.findMany({
    where: {
      OR: [
        { branchId: { in: branchIds } },
        ...(userRole === "SUPERADMIN" ? [{ branchId: null }] : []),
      ],
    },
    include: {
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { lastHeartbeat: "desc" },
  });

  const twoMinutesMs = 2 * 60 * 1000;

  const devices = rawDevices.map((d) => {
    const isOnline = isWithinLastMs(d.lastHeartbeat, twoMinutesMs) && d.isPaired;

    return {
      id: d.id,
      deviceName: d.deviceName,
      deviceUid: d.deviceUid,
      deviceType: d.deviceType,
      isPaired: d.isPaired,
      branchId: d.branchId,
      branchName: d.branch?.name || null,
      lastHeartbeat: d.lastHeartbeat ? d.lastHeartbeat.toISOString() : "",
      isOnline,
    };
  });

  return <DeviceManagerClient devices={devices} branches={branches} />;
}
