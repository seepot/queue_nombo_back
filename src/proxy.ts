import { auth } from "@/lib/auth";
import type { NextAuthRequest } from "next-auth";
import { NextResponse, type NextFetchEvent, type NextMiddleware, type NextRequest } from "next/server";

/**
 * Laluan awam: tidak perlu sesi, jadi dilayan tanpa pembalut `auth()`.
 *
 * Ini penting untuk `/api/auth/*`: pembalut `auth()` memanggil Auth.js untuk membaca sesi dan,
 * jika permintaan tiada kuki CSRF, ia menjana token CSRF baharu lalu menambah kuki itu pada
 * respons. Pengendali `/api/auth/csrf` sendiri turut menjana token, maka satu respons akan
 * membawa dua kuki `authjs.csrf-token` dengan nilai berbeza. Dengan melangkau pembalut untuk
 * laluan awam, hanya pengendali Auth.js yang menetapkan kuki tersebut.
 */
const PUBLIC_ROUTES = [
  "/api/auth",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/api/cron",
  "/api/health",
  "/images",
  "/api/tv",
  "/api/devices",
  "/api/tickets",
  "/ticket",
  "/scan",
  "/qrcode/print",
  "/pricing",
  "/api/billing/webhook",
  "/api/branches",
  "/book",
  "/api/appointments",
  "/api/feedback",
  "/kiosk",
];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

// -----------------------------------------------------------------------------
// Subdomain tenant: <slug>.<NEXT_PUBLIC_APP_DOMAIN>  (cth: klinik-a.quenombo.com)
// Dalam pembangunan, <slug>.localhost turut disokong (pelayar menghala *.localhost ke 127.0.0.1).
// -----------------------------------------------------------------------------
const SUBDOMAIN_IGNORED = new Set(["www", "app", "api", "admin", "mail", "static", "cdn", "assets"]);
const SLUG_LABEL = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Pulangkan slug tenant jika hos ialah subdomain tenant, jika tidak null. */
export function tenantSlugFromHost(hostHeader: string | null): string | null {
  if (!hostHeader) return null;
  const host = hostHeader.split(":")[0].toLowerCase();
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN || "").toLowerCase().replace(/^\.+/, "");

  let label: string | null = null;
  if (appDomain && host.endsWith(`.${appDomain}`)) {
    label = host.slice(0, -(appDomain.length + 1));
  } else if (host.endsWith(".localhost")) {
    label = host.slice(0, -".localhost".length);
  }

  if (!label || label.includes(".") || SUBDOMAIN_IGNORED.has(label) || !SLUG_LABEL.test(label)) {
    return null;
  }
  return label;
}

/** Laluan awam yang dipendekkan pada subdomain tenant: /kiosk -> /kiosk/<slug>, dsb. */
const SUBDOMAIN_REWRITES: Record<string, string> = {
  "/": "/scan",
  "/scan": "/scan",
  "/kiosk": "/kiosk",
  "/book": "/book",
};

/** Ubah hala / tulis semula untuk subdomain tenant; null jika tiada tindakan. */
function handleTenantSubdomain(req: NextRequest, slug: string): NextResponse | null {
  const { pathname } = req.nextUrl;

  const base = SUBDOMAIN_REWRITES[pathname];
  if (base) {
    const url = req.nextUrl.clone();
    url.pathname = `${base}/${slug}`;
    return NextResponse.rewrite(url, { request: { headers: withTenantHeader(req, slug) } });
  }

  if (pathname === "/login" && !req.nextUrl.searchParams.get("org")) {
    // Bina URL daripada header Host asal supaya ubah hala kekal pada subdomain tenant
    const host = req.headers.get("host") || req.nextUrl.host;
    const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "");
    const url = new URL(`${pathname}${req.nextUrl.search}`, `${proto}://${host}`);
    url.searchParams.set("org", slug);
    return NextResponse.redirect(url);
  }

  return null;
}

function withTenantHeader(req: NextRequest, slug: string): Headers {
  const headers = new Headers(req.headers);
  headers.set("x-tenant-slug", slug);
  return headers;
}

/** Jenis dua parameter supaya `auth()` memilih overload middleware, bukan overload pengendali laluan. */
type AuthenticatedProxy = (req: NextAuthRequest, event: NextFetchEvent) => ReturnType<NextMiddleware>;

/** Laluan yang memerlukan sesi: `req.auth` diisi oleh pembalut `auth()`. */
const protectedProxy: AuthenticatedProxy = (req) => {
  const { pathname } = req.nextUrl;

  // If already authenticated and accessing login page, redirect to dashboard
  if (pathname === "/login") {
    if (req.auth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // If not authenticated, redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = req.auth.user as any;
  const userRole = user?.role;

  // Superadmin routes
  if (pathname.startsWith("/superadmin") && userRole !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
};

const withAuth = auth(protectedProxy);

export default function proxy(req: NextRequest, event: NextFetchEvent) {
  const tenantSlug = tenantSlugFromHost(req.headers.get("host"));

  if (tenantSlug) {
    const handled = handleTenantSubdomain(req, tenantSlug);
    if (handled) return handled;
  }

  if (isPublicRoute(req.nextUrl.pathname)) {
    return tenantSlug
      ? NextResponse.next({ request: { headers: withTenantHeader(req, tenantSlug) } })
      : NextResponse.next();
  }
  return withAuth(req, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
