import fs from "fs";
import path from "path";

export interface AuditLogEntry {
  timestamp?: string;
  action: string;
  userId?: string | number | null;
  username?: string | null;
  userRole?: string | number | null;
  cawangan?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
  status: "SUCCESS" | "FAILED";
}

const LOGS_DIR = path.join(process.cwd(), "logs");

/**
 * Ensures the logs directory exists
 */
function ensureLogsDir() {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
}

/**
 * Returns today's log filename in format: logs/audit-YYYY-MM-DD.log
 */
function getLogFilePath(dateStr?: string): string {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  return path.join(LOGS_DIR, `audit-${date}.log`);
}

/**
 * Writes an audit event to today's log file
 */
export async function logAudit(entry: AuditLogEntry): Promise<void> {
  try {
    ensureLogsDir();
    const fullEntry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };
    const line = JSON.stringify(fullEntry) + "\n";
    const filePath = getLogFilePath();
    await fs.promises.appendFile(filePath, line, "utf-8");
  } catch (error) {
    // Non-blocking fallback so logging never crashes main transaction flow
    console.error("[AuditLogger Error]:", error);
  }
}

/**
 * Reads audit log entries for a given date (default: today)
 */
export async function readAuditLogs(dateStr?: string): Promise<AuditLogEntry[]> {
  try {
    ensureLogsDir();
    const filePath = getLogFilePath(dateStr);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = await fs.promises.readFile(filePath, "utf-8");
    const lines = content.trim().split("\n");
    const entries: AuditLogEntry[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        entries.push(JSON.parse(line));
      } catch {
        // skip corrupted line
      }
    }
    // Return newest first
    return entries.reverse();
  } catch (error) {
    console.error("[AuditLogger Read Error]:", error);
    return [];
  }
}

/**
 * Lists available audit log dates
 */
export function getAvailableAuditDates(): string[] {
  try {
    ensureLogsDir();
    const files = fs.readdirSync(LOGS_DIR);
    const dates = files
      .filter((file) => file.startsWith("audit-") && file.endsWith(".log"))
      .map((file) => file.replace("audit-", "").replace(".log", ""))
      .sort()
      .reverse();
    return dates;
  } catch {
    return [];
  }
}
