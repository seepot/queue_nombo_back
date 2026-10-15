import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { command } = body;

  return NextResponse.json({
    success: true,
    message: `Arahan [${command}] berjaya dihantar ke TV Display.`,
  });
}
