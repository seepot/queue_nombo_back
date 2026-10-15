import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = session?.user as any;

    if (!user) {
      return NextResponse.json({ success: false, message: "Tidak dibenarkan." }, { status: 401 });
    }

    const body = await req.json();
    const { branchId } = body;

    if (!branchId) {
      return NextResponse.json({ success: false, message: "branchId diperlukan." }, { status: 400 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: { tenant: true },
    });

    if (!branch) {
      return NextResponse.json({ success: false, message: "Cawangan tidak wujud." }, { status: 404 });
    }

    // Set cookie
    const cookieStore = await cookies();
    cookieStore.set("quenombo_active_branch", branch.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 hari
    });

    return NextResponse.json({
      success: true,
      message: `Cawangan aktif telah ditukar kepada '${branch.name}'.`,
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Ralat menukar cawangan." },
      { status: 500 }
    );
  }
}
