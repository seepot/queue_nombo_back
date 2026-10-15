import { NextRequest, NextResponse } from "next/server";
import { sweepExpiredSubscriptions } from "@/lib/subscription";

/**
 * GET /api/cron/subscriptions
 * Sapuan harian status langganan (TRIAL/ACTIVE -> PAST_DUE/EXPIRED).
 * Dilindungi oleh CRON_SECRET: Vercel Cron menghantar "Authorization: Bearer <CRON_SECRET>",
 * PM2/crontab boleh menghantar header "x-cron-secret".
 */
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const bearer = req.headers.get("authorization");
  if (bearer === `Bearer ${secret}`) return true;
  return req.headers.get("x-cron-secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { success: false, message: "CRON_SECRET belum dikonfigurasi pada pelayan." },
      { status: 503 }
    );
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ success: false, message: "Akses dinafikan." }, { status: 401 });
  }

  try {
    const result = await sweepExpiredSubscriptions();
    return NextResponse.json({ success: true, ranAt: new Date().toISOString(), ...result });
  } catch (error) {
    console.error("[Cron Subscriptions Error]:", error);
    return NextResponse.json({ success: false, message: "Ralat semasa sapuan langganan." }, { status: 500 });
  }
}
