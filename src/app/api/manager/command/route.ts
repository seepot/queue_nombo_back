import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readJsonObject, type BranchSettings } from "@/lib/settings";

export async function POST(req: NextRequest) {
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
    const tenantId = user.tenantId;

    if (!tenantId && user.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akaun tiada kaitan dengan penyewa." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { action, branchId, counterId, status, runningText, kioskPaused } = body;

    if (!branchId) {
      return NextResponse.json(
        { success: false, message: "branchId wajib dibekalkan." },
        { status: 400 }
      );
    }

    if (action === "TOGGLE_COUNTER") {
      if (!counterId) {
        return NextResponse.json(
          { success: false, message: "counterId wajib dibekalkan." },
          { status: 400 }
        );
      }

      const counter = await prisma.counter.update({
        where: { id: counterId },
        data: { status: status === "OPEN" ? "OPEN" : "CLOSED" },
      });

      return NextResponse.json({
        success: true,
        message: `Status Kaunter #${counter.counterNo} berjaya ditukar ke ${counter.status}.`,
        counter,
      });
    } else if (action === "BROADCAST_TV_MESSAGE") {
      if (!runningText) {
        return NextResponse.json(
          { success: false, message: "Teks siaran tidak boleh kosong." },
          { status: 400 }
        );
      }

      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return NextResponse.json({ success: false, message: "Cawangan tidak ditemui." }, { status: 404 });
      }

      const currentSettings = readJsonObject<BranchSettings>(branch.settings);
      const updatedSettings = { ...currentSettings, runningText };

      await prisma.branch.update({
        where: { id: branchId },
        data: { settings: updatedSettings },
      });

      return NextResponse.json({
        success: true,
        message: "Mesej siaran segera berjaya dihantar ke skrin TV lobi!",
      });
    } else if (action === "TOGGLE_KIOSK_PAUSE") {
      const branch = await prisma.branch.findUnique({ where: { id: branchId } });
      if (!branch) {
        return NextResponse.json({ success: false, message: "Cawangan tidak ditemui." }, { status: 404 });
      }

      const currentSettings = readJsonObject<BranchSettings>(branch.settings);
      const updatedSettings = { ...currentSettings, kioskPaused: !!kioskPaused };

      await prisma.branch.update({
        where: { id: branchId },
        data: { settings: updatedSettings },
      });

      return NextResponse.json({
        success: true,
        message: kioskPaused
          ? "Pengambilan tiket kiosk dihentikan sementara (Emergency Pause)."
          : "Kiosk diaktifkan semula untuk pengambilan tiket.",
      });
    }

    return NextResponse.json(
      { success: false, message: "Tindakan tidak sah." },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Manager Command Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat semasa memproses arahan pengurus.") },
      { status: 500 }
    );
  }
}
