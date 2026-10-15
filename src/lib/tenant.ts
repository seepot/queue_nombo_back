import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

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
    // Jika ada subdomain (bukan localhost / apex domain)
    if (parts.length > 2 && parts[0] !== "www" && parts[0] !== "app") {
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
