export interface TenantHealthMetrics {
  ticketCountLast7Days: number;
  totalTickets: number;
  activeCounters: number;
  totalStaff: number;
  activeStaffWithRecentLogin: number;
  daysUntilExpiry: number | null;
  status: string;
}

export interface TenantHealthResult {
  score: number; // 0 - 100
  status: "HEALTHY" | "STABLE" | "AT_RISK";
  statusColor: string;
  badgeText: string;
  reasons: string[];
}

export function calculateTenantHealth(metrics: TenantHealthMetrics): TenantHealthResult {
  let score = 50; // Base score
  const reasons: string[] = [];

  // 1. Status Organisasi
  if (metrics.status !== "ACTIVE") {
    return {
      score: 10,
      status: "AT_RISK",
      statusColor: "red",
      badgeText: "Digantung / Tidak Aktif",
      reasons: ["Akaun organisasi sedang digantung."],
    };
  }

  // 2. Ticket Velocity (Trafik 7 Hari)
  if (metrics.ticketCountLast7Days >= 50) {
    score += 25;
    reasons.push(`Trafik tinggi (${metrics.ticketCountLast7Days} tiket dlm 7 hari).`);
  } else if (metrics.ticketCountLast7Days >= 10) {
    score += 15;
    reasons.push(`Trafik sederhana (${metrics.ticketCountLast7Days} tiket dlm 7 hari).`);
  } else if (metrics.ticketCountLast7Days > 0) {
    score += 5;
    reasons.push(`Trafik rendah (${metrics.ticketCountLast7Days} tiket dlm 7 hari).`);
  } else {
    score -= 20;
    reasons.push("Tiada sebarang tiket dikeluarkan dalam 7 hari terakhir.");
  }

  // 3. Staf & Log Masuk
  if (metrics.activeStaffWithRecentLogin > 0) {
    score += 15;
    reasons.push(`${metrics.activeStaffWithRecentLogin} staf log masuk baru-baru ini.`);
  } else {
    score -= 15;
    reasons.push("Tiada staf log masuk dalam tempoh 7 hari.");
  }

  // 4. Status Langganan
  if (metrics.daysUntilExpiry !== null) {
    if (metrics.daysUntilExpiry <= 0) {
      score -= 30;
      reasons.push("Langganan telah tamat tempoh.");
    } else if (metrics.daysUntilExpiry <= 7) {
      score -= 10;
      reasons.push(`Langganan bakal tamat dalam ${metrics.daysUntilExpiry} hari.`);
    } else if (metrics.daysUntilExpiry > 30) {
      score += 10;
    }
  }

  // Bound score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  if (score >= 75) {
    return {
      score,
      status: "HEALTHY",
      statusColor: "emerald",
      badgeText: "🟢 Cemerlang",
      reasons,
    };
  } else if (score >= 45) {
    return {
      score,
      status: "STABLE",
      statusColor: "amber",
      badgeText: "🟡 Sederhana",
      reasons,
    };
  } else {
    return {
      score,
      status: "AT_RISK",
      statusColor: "red",
      badgeText: "🔴 Berisiko Churn",
      reasons,
    };
  }
}
