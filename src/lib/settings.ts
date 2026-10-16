/**
 * Bentuk medan `settings` (lajur Json?) bagi Tenant dan Branch, serta pembaca bertaip
 * untuk nilai Json Prisma. Semua medan pilihan kerana rekod lama mungkin tidak lengkap.
 */
import type { Prisma } from "@prisma/client";

export type OperatingHours = {
  openTime: string;
  closeTime: string;
  days: string[];
};

/** `Branch.settings` */
export type BranchSettings = {
  operatingHours?: OperatingHours;
  runningText?: string;
  kioskPaused?: boolean;
  youtubeUrl?: string;
  voiceLanguage?: string;
};

export type WhatsAppSettings = {
  provider?: string;
  apiKey?: string;
  phoneNumberId?: string;
};

export type TenantFeatureFlags = {
  enableAiOptima?: boolean;
  enableVoiceAnnouncer?: boolean;
  enableOfflineEdge?: boolean;
  enableExternalApi?: boolean;
  enablePwaManager?: boolean;
};

/** Permohonan pemadaman akaun organisasi (PDPA). Dilaksanakan oleh superadmin selepas tempoh ihsan. */
export type TenantDeletionRequest = {
  status: "PENDING";
  requestedAt: string;
  requestedBy: string;
  requestedByName?: string;
  reason?: string | null;
  /** Tarikh paling awal pemadaman boleh dilaksanakan (ISO) */
  scheduledFor: string;
};

/** `Tenant.settings` */
export type TenantSettings = {
  theme?: string;
  logoUrl?: string;
  youtubeUrl?: string;
  voiceLanguage?: string;
  runningText?: string;
  internalNotes?: string;
  featureFlags?: TenantFeatureFlags;
  whatsapp?: WhatsAppSettings;
  webhookUrl?: string;
  deletionRequest?: TenantDeletionRequest;
};

/** Tetapan global platform yang disimpan dalam `AuditLog.details` (PLATFORM_GLOBAL_SETTINGS_UPDATED). */
export type PlatformSettings = {
  announcementBanner: string;
  announcementType: string;
  maintenanceMode: boolean;
  updatedBy?: string;
  updatedAt?: string;
};

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  announcementBanner: "",
  announcementType: "INFO",
  maintenanceMode: false,
};

/**
 * Baca lajur Json Prisma sebagai objek bertaip `T`. Nilai null/undefined (atau bukan objek)
 * dipulangkan sebagai objek kosong, sama seperti corak `(x as any) || {}` yang digantikannya.
 */
export function readJsonObject<T extends object>(value: Prisma.JsonValue | null | undefined): T {
  const obj: object = value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
  return obj as T;
}
