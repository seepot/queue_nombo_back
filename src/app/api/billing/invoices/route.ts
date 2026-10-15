import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

    if (!tenantId) {
      return NextResponse.json(
        { success: false, message: "Akaun tiada kaitan dengan tenant." },
        { status: 400 }
      );
    }

    const invoices = await prisma.paymentTransaction.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error("[Invoices List Error]:", error);
    return NextResponse.json(
      { success: false, message: "Ralat semasa mendapatkan senarai invois." },
      { status: 500 }
    );
  }
}
