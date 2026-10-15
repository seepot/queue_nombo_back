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
  if (isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return withAuth(req, event);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
