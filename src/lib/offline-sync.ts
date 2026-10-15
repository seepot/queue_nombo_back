import { getErrorMessage } from "./errors";

/**
 * QueNombo Offline Sync Engine (Fasa 19)
 * Manages local edge queue buffering and automatic batch reconciliation with Cloud.
 */

export interface OfflineTicketPayload {
  id: string;
  ticketNo: string;
  branchId: string;
  categoryId: string;
  categoryName: string;
  phoneNo?: string;
  createdAt: string;
  source: "OFFLINE_KIOSK" | "OFFLINE_TERMINAL";
}

const OFFLINE_BUFFER_KEY = "quenombo_offline_tickets_buffer";
const OFFLINE_LAST_SEQ_KEY = "quenombo_offline_last_seq";

export function getOfflineBuffer(): OfflineTicketPayload[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OFFLINE_BUFFER_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineTicketToBuffer(ticket: OfflineTicketPayload): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineBuffer();
    current.push(ticket);
    localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(current));
  } catch (err) {
    console.error("Failed to save offline ticket:", err);
  }
}

export function clearSyncedOfflineTickets(syncedIds: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const current = getOfflineBuffer();
    const remaining = current.filter((t) => !syncedIds.includes(t.id));
    localStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(remaining));
  } catch (err) {
    console.error("Failed to clear synced tickets:", err);
  }
}

/**
 * Generates an offline ticket number using locally cached sequence
 */
export function generateLocalOfflineTicket(params: {
  prefixCode: string;
  branchId: string;
  categoryId: string;
  categoryName: string;
  phoneNo?: string;
}): OfflineTicketPayload {
  const seqKey = `${OFFLINE_LAST_SEQ_KEY}_${params.prefixCode}`;
  let lastSeq = 1000;

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(seqKey);
      if (stored) {
        lastSeq = parseInt(stored, 10);
      }
    } catch {
      // Ignore
    }
  }

  const nextSeq = lastSeq + 1;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(seqKey, String(nextSeq));
    } catch {
      // Ignore
    }
  }

  const ticketNo = `${params.prefixCode}${nextSeq}`;
  const id = `offline_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const payload: OfflineTicketPayload = {
    id,
    ticketNo,
    branchId: params.branchId,
    categoryId: params.categoryId,
    categoryName: params.categoryName,
    phoneNo: params.phoneNo,
    createdAt: new Date().toISOString(),
    source: "OFFLINE_KIOSK",
  };

  saveOfflineTicketToBuffer(payload);
  return payload;
}

/**
 * Synchronizes all pending buffered offline tickets to Cloud PostgreSQL
 */
export async function syncOfflineTicketsToCloud(): Promise<{
  success: boolean;
  syncedCount: number;
  message: string;
}> {
  const buffer = getOfflineBuffer();
  if (buffer.length === 0) {
    return { success: true, syncedCount: 0, message: "Tiada data luar talian untuk disegerak." };
  }

  try {
    const res = await fetch("/api/sync/offline-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tickets: buffer }),
    });

    const data = await res.json();
    if (data.success && Array.isArray(data.syncedIds)) {
      clearSyncedOfflineTickets(data.syncedIds);
      return {
        success: true,
        syncedCount: data.syncedIds.length,
        message: `${data.syncedIds.length} rekod tiket luar talian berjaya disegerakkan ke pelayan awan.`,
      };
    } else {
      return {
        success: false,
        syncedCount: 0,
        message: data.message || "Gagal menyegerakkan data luar talian.",
      };
    }
  } catch (err) {
    return {
      success: false,
      syncedCount: 0,
      message: getErrorMessage(err, "Ralat rangkaian semasa penyegerakan."),
    };
  }
}
