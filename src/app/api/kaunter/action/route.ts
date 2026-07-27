import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// OneSignal App ID (from old PHP)
const ONESIGNAL_APP_ID = "41ce91dc-943f-4cbc-bee9-90918cabcb63";

// Helper: derive per-branch tiket table name from cawangan id
function getTiketTable(cawangan: string): string {
  const negeri = cawangan.substring(2, 4);
  return `tiket_${negeri}`;
}

// Helper: send push notification via OneSignal
async function sendPushNotification(playerIds: string[], message: string) {
  if (!playerIds.length || !playerIds[0]) return;

  try {
    await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: playerIds.filter(Boolean),
        contents: { en: message },
        data: { foo: "bar" },
      }),
    });
  } catch {
    // Silently fail - push notification is not critical
  }
}

async function publishTicketCall(payload: {
  kind: "called" | "recalled" | "reactivated";
  cawangan: string;
  no_tiket: number;
  transid: string;
  kaunter: number;
  call_date: string;
  status_tiket: number;
}) {
  const realtimeUrl = process.env.REALTIME_SERVICE_URL;
  if (!realtimeUrl) return;

  try {
    await fetch(`${realtimeUrl.replace(/\/$/, "")}/publish/display`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.REALTIME_SERVICE_SECRET
          ? { "x-realtime-secret": process.env.REALTIME_SERVICE_SECRET }
          : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Realtime delivery is best-effort; queue state already persisted in DB.
  }
}

/**
 * Kaunter action API - handles all staff counter operations
 * 
 * Actions (matching old PHP welcome.php):
 * - seterusnya: Call next ticket in queue
 * - panggil_semula: Recall current ticket
 * - aktif_semula: Reactivate a cancelled ticket
 * - pindah: Transfer ticket to another counter/service
 * - selesai: Mark current ticket as completed
 * - batal: Cancel current ticket
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { action } = body;
  const cawangan = session.user.idCawangan;
  let noKaunter = session.user.noKaunter;
  let susunan = session.user.susunanKeutamaan || "";

  // Fallback: if kaunter not in session (old JWT), look it up from DB
  if (!noKaunter) {
    const userData = await prisma.user.findFirst({
      where: { id: Number(session.user.id) },
    });
    if (userData?.uname) {
      const kaunterData = await prisma.$queryRawUnsafe<
        Array<{ no_kaunter: string | null; susunan_keutamaan: string | null }>
      >(
        `SELECT k.no_kaunter, k.susunan_keutamaan FROM kaunter k
         INNER JOIN jadual_tugasan j ON j.id_kaunter = k.id
         WHERE j.nokp = ? LIMIT 1`,
        userData.uname
      );
      if (kaunterData.length) {
        noKaunter = kaunterData[0].no_kaunter || undefined;
        susunan = kaunterData[0].susunan_keutamaan || "";
      }
    }
  }

  const kaunterNum = noKaunter ? Number(noKaunter) : 0;
  // Use Malaysia local time (UTC+8) for all date/time fields
  const localNow = new Date(Date.now() + 8 * 60 * 60 * 1000);
  const todayStr = localNow.toISOString().slice(0, 10);
  const now = localNow.toISOString().slice(0, 19).replace("T", " ");
  const tbl = getTiketTable(cawangan);

  switch (action) {
    // ==================== SETERUSNYA ====================
    // Call next ticket from queue based on susunan_keutamaan
    case "seterusnya": {
      let ticket = null;

      if (susunan) {
        // Iterate through priority order (comma-separated kumpulan IDs)
        const priorities = susunan.split(",").map((s) => s.trim());

        for (const kumpId of priorities) {
          if (kumpId === "0") {
            // "Pelbagai" - get any ticket waiting
            const result = await prisma.$queryRawUnsafe<
              Array<{ id: number; no_tiket: number; transid: string }>
            >(
              `SELECT id, no_tiket, transid FROM ${tbl}
               WHERE cawangan = ? AND status_tiket < 4 AND kaunter IS NULL AND DATE(tarikh) = ?
               ORDER BY no_tiket ASC LIMIT 1`,
              cawangan,
              todayStr
            );
            if (result.length > 0) {
              ticket = result[0];
              break;
            }
          } else {
            // Specific service group - match perkhidmatan_khas
            const result = await prisma.$queryRawUnsafe<
              Array<{ id: number; no_tiket: number; transid: string }>
            >(
              `SELECT id, no_tiket, transid FROM ${tbl}
               WHERE perkhidmatan_khas IN (?)
               AND cawangan = ? AND status_tiket < 4 AND kaunter IS NULL AND DATE(tarikh) = ?
               ORDER BY no_tiket ASC LIMIT 1`,
              kumpId,
              cawangan,
              todayStr
            );
            if (result.length > 0) {
              ticket = result[0];
              break;
            }
          }
        }
      } else {
        // No susunan - just get any next ticket
        const result = await prisma.$queryRawUnsafe<
          Array<{ id: number; no_tiket: number; transid: string }>
        >(
          `SELECT id, no_tiket, transid FROM ${tbl}
           WHERE cawangan = ? AND status_tiket < 4 AND kaunter IS NULL AND DATE(tarikh) = ?
           ORDER BY no_tiket ASC LIMIT 1`,
          cawangan,
          todayStr
        );
        if (result.length > 0) {
          ticket = result[0];
        }
      }

      if (!ticket) {
        return NextResponse.json(
          { error: "Tiada tiket dalam giliran" },
          { status: 404 }
        );
      }

      // Update: set status=1 (Panggilan), assign kaunter, set call_date
      await prisma.$queryRawUnsafe(
        `UPDATE ${tbl} SET status_tiket = 1, call_date = ?, kaunter = ?, bilangan_panggil = 1
         WHERE id = ?`,
        now,
        kaunterNum,
        Number(ticket.id)
      );

      await publishTicketCall({
        kind: "called",
        cawangan,
        no_tiket: Number(ticket.no_tiket),
        transid: ticket.transid,
        kaunter: kaunterNum,
        call_date: now,
        status_tiket: 1,
      });

      // Send push notification to customer
      const ticketData = await prisma.$queryRawUnsafe<
        Array<{ player_id: string | null }>
      >(`SELECT player_id FROM ${tbl} WHERE id = ?`, Number(ticket.id));
      const playerId = ticketData[0]?.player_id;
      if (playerId) {
        const msg = `Nombor ${ticket.no_tiket}. Sila ke kaunter ${noKaunter}`;
        sendPushNotification(playerId.split(","), msg);
      }

      return NextResponse.json({
        success: true,
        no_tiket: ticket.no_tiket,
        transid: ticket.transid,
      });
    }

    // ==================== PANGGIL SEMULA ====================
    // Recall current ticket (increment bilangan_panggil)
    case "panggil_semula": {
      const { no_tiket, transid } = body;

      if (!no_tiket) {
        return NextResponse.json(
          { error: "Tiada tiket untuk dipanggil semula" },
          { status: 400 }
        );
      }

      await prisma.$queryRawUnsafe(
        `UPDATE ${tbl} SET call_date = ?, status_tiket = 2, bilangan_panggil = bilangan_panggil + 1
         WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
        now,
        cawangan,
        Number(no_tiket),
        todayStr
      );

      await publishTicketCall({
        kind: "recalled",
        cawangan,
        no_tiket: Number(no_tiket),
        transid: transid || String(no_tiket),
        kaunter: kaunterNum,
        call_date: now,
        status_tiket: 2,
      });

      // Send push notification for recall
      const recallData = await prisma.$queryRawUnsafe<
        Array<{ player_id: string | null }>
      >(
        `SELECT player_id FROM ${tbl} WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ? LIMIT 1`,
        cawangan,
        Number(no_tiket),
        todayStr
      );
      const recallPlayerId = recallData[0]?.player_id;
      if (recallPlayerId) {
        const msg = `Nombor ${no_tiket}. Sila ke kaunter ${noKaunter}`;
        sendPushNotification(recallPlayerId.split(","), msg);
      }

      return NextResponse.json({
        success: true,
        no_tiket,
        transid,
      });
    }

    // ==================== AKTIF SEMULA ====================
    // Reactivate a cancelled ticket
    case "aktif_semula": {
      const { no_tiket: reactivateNo } = body;

      if (!reactivateNo) {
        return NextResponse.json(
          { error: "Sila nyatakan nombor tiket" },
          { status: 400 }
        );
      }

      await prisma.$queryRawUnsafe(
        `UPDATE ${tbl} SET status_tiket = 1, call_date = ?, kaunter = ?
         WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
        now,
        kaunterNum,
        cawangan,
        Number(reactivateNo),
        todayStr
      );

      await publishTicketCall({
        kind: "reactivated",
        cawangan,
        no_tiket: Number(reactivateNo),
        transid: String(reactivateNo),
        kaunter: kaunterNum,
        call_date: now,
        status_tiket: 1,
      });

      // Send push notification for reactivation
      const reactivateData = await prisma.$queryRawUnsafe<
        Array<{ player_id: string | null }>
      >(
        `SELECT player_id FROM ${tbl} WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ? LIMIT 1`,
        cawangan,
        Number(reactivateNo),
        todayStr
      );
      const reactivatePlayerId = reactivateData[0]?.player_id;
      if (reactivatePlayerId) {
        const msg = `Nombor ${reactivateNo}. Sila ke kaunter ${noKaunter}`;
        sendPushNotification(reactivatePlayerId.split(","), msg);
      }

      return NextResponse.json({
        success: true,
        no_tiket: reactivateNo,
      });
    }

    // ==================== PINDAH ====================
    // Transfer ticket to another counter or service group
    case "pindah": {
      const { no_tiket: pindahNo, kaunter_baru, perkhidmatan_baru } = body;

      if (!pindahNo) {
        return NextResponse.json(
          { error: "Sila nyatakan nombor tiket" },
          { status: 400 }
        );
      }

      if (perkhidmatan_baru && perkhidmatan_baru !== "0") {
        // Transfer to different service group - find its cawangan
        const kumpData = await prisma.kumpulanPerkhidmatan.findUnique({
          where: { id: Number(perkhidmatan_baru) },
        });
        const cawBaru = kumpData?.idCawangan || cawangan;

        await prisma.$queryRawUnsafe(
          `UPDATE ${tbl} SET transfer_from = ?, status_tiket = 6, transfer_date = ?,
           perkhidmatan_khas = ?, cawangan = ?, kaunter = NULL
           WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
          kaunterNum,
          now,
          perkhidmatan_baru,
          cawBaru,
          cawangan,
          Number(pindahNo),
          todayStr
        );
      } else {
        // Transfer to another counter
        const kaunterBaruNum = kaunter_baru ? Number(kaunter_baru) : null;

        await prisma.$queryRawUnsafe(
          `UPDATE ${tbl} SET transfer_from = ?, kaunter = ?, status_tiket = 6, transfer_date = ?
           WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
          kaunterNum,
          kaunterBaruNum,
          now,
          cawangan,
          Number(pindahNo),
          todayStr
        );
      }

      return NextResponse.json({ success: true });
    }

    // ==================== SELESAI ====================
    // Mark ticket as completed
    case "selesai": {
      const { no_tiket: selesaiNo } = body;

      if (!selesaiNo) {
        return NextResponse.json(
          { error: "Tiada tiket untuk diselesaikan" },
          { status: 400 }
        );
      }

      await prisma.$queryRawUnsafe(
        `UPDATE ${tbl} SET end_date = ?, status_tiket = 4
         WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
        now,
        cawangan,
        Number(selesaiNo),
        todayStr
      );

      return NextResponse.json({ success: true });
    }

    // ==================== BATAL ====================
    // Cancel ticket
    case "batal": {
      const { no_tiket: batalNo } = body;

      if (!batalNo) {
        return NextResponse.json(
          { error: "Tiada tiket untuk dibatalkan" },
          { status: 400 }
        );
      }

      await prisma.$queryRawUnsafe(
        `UPDATE ${tbl} SET end_date = ?, cancel_date = ?, status_tiket = 5, batal_oleh = 1
         WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ?`,
        now,
        now,
        cawangan,
        Number(batalNo),
        todayStr
      );

      // Send push notification for cancellation
      const batalData = await prisma.$queryRawUnsafe<
        Array<{ player_id: string | null }>
      >(
        `SELECT player_id FROM ${tbl} WHERE cawangan = ? AND no_tiket = ? AND DATE(tarikh) = ? LIMIT 1`,
        cawangan,
        Number(batalNo),
        todayStr
      );
      const batalPlayerId = batalData[0]?.player_id;
      if (batalPlayerId) {
        const msg = `(5) - Nombor ${batalNo} telah dibatalkan. Sila dapatkan nombor baharu untuk urusan seterusnya`;
        sendPushNotification(batalPlayerId.split(","), msg);
      }

      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json(
        { error: "Invalid action" },
        { status: 400 }
      );
  }
}
