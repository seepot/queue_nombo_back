/**
 * Helper utiliti untuk memancarkan event ke Realtime WebSocket Service (NestJS Gateway).
 */
export async function broadcastToRealtime(
  endpoint: "publish/display" | "publish/device-paired",
  payload: Record<string, unknown>
): Promise<boolean> {
  const realtimeUrl = process.env.REALTIME_SERVICE_URL;
  const realtimeSecret = process.env.REALTIME_SERVICE_SECRET;

  if (!realtimeUrl) return false;

  try {
    const res = await fetch(`${realtimeUrl}/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(realtimeSecret ? { "x-realtime-secret": realtimeSecret } : {}),
      },
      body: JSON.stringify(payload),
    });

    return res.ok;
  } catch (error) {
    // Non-blocking fallback jika WebSocket service offline sementara
    console.error("[Realtime Broadcast Error]:", error);
    return false;
  }
}
