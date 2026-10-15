import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // If already authenticated and accessing login page, redirect to dashboard
  if (pathname === "/login") {
    if (req.auth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    return NextResponse.next();
  }

  // Public routes
  const publicRoutes = [
    "/api/auth",
    "/register",
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
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublic) {
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
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
