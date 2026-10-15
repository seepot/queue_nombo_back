import { NextRequest, NextResponse } from "next/server";
import { getErrorMessage } from "@/lib/errors";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    const cookieStore = await cookies();
    const impersonateCookie = cookieStore.get("quenombo_impersonate")?.value;

    if (!impersonateCookie) {
      return NextResponse.json({ isImpersonating: false });
    }

    const data = JSON.parse(impersonateCookie);
    return NextResponse.json({
      isImpersonating: true,
      originalRole: user?.role || "SUPERADMIN",
      tenantId: data.tenantId,
      tenantName: data.tenantName,
      tenantSlug: data.tenantSlug,
    });
  } catch {
    return NextResponse.json({ isImpersonating: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (user?.role !== "SUPERADMIN") {
      return NextResponse.json(
        { success: false, message: "Akses dinafikan. Hanya SuperAdmin dibenarkan." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { tenantId } = body;

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "tenantId diperlukan." },
        { status: 400 }
      );
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { branches: true },
    });

    if (!tenant) {
      return NextResponse.json(
        { success: false, message: "Organisasi tidak ditemui." },
        { status: 404 }
      );
    }

    const impersonationPayload = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      branchId: tenant.branches[0]?.id || null,
      branchName: tenant.branches[0]?.name || null,
      startedAt: new Date().toISOString(),
      superadminEmail: user.email || user.username || "superadmin",
    };

    const cookieStore = await cookies();
    cookieStore.set("quenombo_impersonate", JSON.stringify(impersonationPayload), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2, // 2 jam maksimum sesi penyamaran
    });

    await prisma.auditLog.create({
      data: {
        tenantId: tenant.id,
        action: "SUPERADMIN_GHOST_IMPERSONATION_STARTED",
        details: { superadmin: user.email || user.username, targetTenant: tenant.name },
        status: "SUCCESS",
      },
    });

    return NextResponse.json({
      success: true,
      message: `Mod penyamaran diaktifkan bagi '${tenant.name}'!`,
      tenant,
    });
  } catch (error) {
    console.error("[Impersonate POST Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat semasa mengaktifkan penyamaran.") },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const impersonateCookie = cookieStore.get("quenombo_impersonate")?.value;

    if (impersonateCookie) {
      try {
        const data = JSON.parse(impersonateCookie);
        await prisma.auditLog.create({
          data: {
            tenantId: data.tenantId,
            action: "SUPERADMIN_GHOST_IMPERSONATION_STOPPED",
            details: { targetTenant: data.tenantName },
            status: "SUCCESS",
          },
        });
      } catch {
        // Abaikan jika ralat parse log
      }
    }

    cookieStore.delete("quenombo_impersonate");

    return NextResponse.json({
      success: true,
      message: "Mod penyamaran telah ditamatkan. Anda kembali sebagai SuperAdmin.",
    });
  } catch (error) {
    console.error("[Impersonate DELETE Error]:", error);
    return NextResponse.json(
      { success: false, message: getErrorMessage(error, "Ralat semasa menamatkan penyamaran.") },
      { status: 500 }
    );
  }
}
