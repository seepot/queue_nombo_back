import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ["/login", "/api/auth"];
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
  const levelAkses = req.auth.user.levelAkses;

  // Superadmin routes (level 1)
  if (pathname.startsWith("/superadmin") && levelAkses !== "1") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
  runtime: "nodejs",
};
