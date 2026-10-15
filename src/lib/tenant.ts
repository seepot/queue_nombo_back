import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

// -----------------------------------------------------------------------------
// SLUG TENANT: peraturan format & senarai terpelihara
// -----------------------------------------------------------------------------

export const TENANT_SLUG_MIN_LENGTH = 3;
export const TENANT_SLUG_MAX_LENGTH = 40;

/**
 * Slug yang tidak boleh didaftarkan oleh tenant kerana bertembung dengan
 * subdomain sistem, laluan aplikasi atau nama infrastruktur.
 * Guna semula senarai ini di mana-mana slug tenant disahkan.
 */
export const RESERVED_TENANT_SLUGS: ReadonlySet<string> = new Set([
  // Subdomain / hos infrastruktur
  "www", "app", "api", "cdn", "static", "assets", "images", "img", "media", "files",
  "mail", "smtp", "imap", "pop", "webmail", "ftp", "sftp", "ns", "ns1", "ns2", "mx",
  "localhost", "dev", "staging", "beta", "test", "status", "health",
  // Peranan & pentadbiran
  "admin", "administrator", "superadmin", "root", "system", "sys", "owner", "staff",
  // Laluan aplikasi QueNombo (src/app)
  "login", "logout", "signin", "signup", "register", "auth", "forgot-password",
  "reset-password", "verify-email", "dashboard", "onboarding", "pricing", "kiosk",
  "book", "booking", "scan", "ticket", "tickets", "qrcode", "qr", "terminal", "display",
  "tv", "peranti", "cawangan", "temujanji", "analisis", "integrasi", "pengurus",
  "maklumbalas", "ai-optima", "langganan", "billing", "invoice", "invois", "cron",
  // Sokongan & korporat
  "support", "help", "helpdesk", "docs", "blog", "news", "about", "contact", "legal",
  "privacy", "terms", "security", "abuse", "noreply", "no-reply", "postmaster",
  // Jenama
  "quenombo", "jpjeq", "jpj",
  // Nilai literal yang mengelirukan
  "null", "undefined", "true", "false", "nan",
]);

/** Awalan yang ditempah untuk kegunaan sistem (cth: `_next`, `api-v2`). */
const RESERVED_TENANT_SLUG_PREFIXES = ["_", "api-", "admin-", "superadmin-", "quenombo-"];

export const TENANT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Bersihkan input bebas kepada bentuk slug (huruf kecil, nombor & sengkang tunggal). */
export function normalizeTenantSlug(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isReservedTenantSlug(slug: string): boolean {
  const s = slug.toLowerCase();
  if (RESERVED_TENANT_SLUGS.has(s)) return true;
  return RESERVED_TENANT_SLUG_PREFIXES.some((prefix) => s.startsWith(prefix));
}

/**
 * Sahkan slug tenant yang telah dinormalkan.
 * Pulangkan mesej ralat (BM) jika tidak sah, atau null jika boleh digunakan.
 */
export function validateTenantSlug(slug: string): string | null {
  if (!slug) return "Slug syarikat diperlukan.";
  if (slug.length < TENANT_SLUG_MIN_LENGTH) {
    return `Slug syarikat mesti sekurang-kurangnya ${TENANT_SLUG_MIN_LENGTH} aksara.`;
  }
  if (slug.length > TENANT_SLUG_MAX_LENGTH) {
    return `Slug syarikat tidak boleh melebihi ${TENANT_SLUG_MAX_LENGTH} aksara.`;
  }
  if (!TENANT_SLUG_PATTERN.test(slug)) {
    return "Slug syarikat hanya boleh mengandungi huruf kecil, nombor dan sengkang (-).";
  }
  if (isReservedTenantSlug(slug)) {
    return `Slug '${slug}' dikhaskan untuk kegunaan sistem. Sila pilih slug lain.`;
  }
  return null;
}

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  planType: string;
  status: string;
}

/**
 * Ekstrak maklumat Tenant daripada subdomain atau header API.
 * Cth: `dr-azman.smartq.com` -> slug: `dr-azman`
 * atau Header: `x-tenant-id` / `x-tenant-slug`
 */
export async function resolveTenant(
  req: NextRequest
): Promise<TenantContext | null> {
  const host = req.headers.get("host") || "";
  const headerTenantId = req.headers.get("x-tenant-id");
  const headerTenantSlug = req.headers.get("x-tenant-slug");

  let slug: string | null = headerTenantSlug;

  if (!slug && !headerTenantId) {
    const parts = host.split(".");
    // Jika ada subdomain (bukan localhost / apex domain / subdomain sistem)
    if (parts.length > 2 && !isReservedTenantSlug(parts[0])) {
      slug = parts[0];
    }
  }

  // 1. Cuba cari dalam cache Redis dahulu (<1ms)
  const cacheKey = headerTenantId
    ? `tenant:cache:id:${headerTenantId}`
    : slug
    ? `tenant:cache:slug:${slug}`
    : null;

  if (cacheKey) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {
      // Abaikan jika Redis offline
    }
  }

  // 2. Cari dalam pangkalan data PostgreSQL
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        ...(headerTenantId ? [{ id: headerTenantId }] : []),
        ...(slug ? [{ slug }] : []),
      ],
      status: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      slug: true,
      planType: true,
      status: true,
    },
  });

  if (!tenant) return null;

  const result: TenantContext = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    planType: tenant.planType,
    status: tenant.status,
  };

  // Simpan dalam cache (1 jam)
  if (cacheKey) {
    try {
      await redis.set(cacheKey, JSON.stringify(result), "EX", 3600);
    } catch {
      // Abaikan jika Redis offline
    }
  }

  return result;
}
