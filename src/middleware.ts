import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "brilink-super-secret-jwt-key-change-in-production-2026"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("brilink_session")?.value;

  let session: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload;
    } catch {
      // invalid or expired token
    }
  }

  // 1. If accessing login page while already logged in (unless explicitly re-authenticating)
  if (pathname === "/login") {
    const forceReauth = request.nextUrl.searchParams.get("reauth") === "1";
    if (session && !forceReauth) {
      if (session.role === "OWNER") {
        return NextResponse.redirect(new URL("/owner", request.url));
      } else {
        return NextResponse.redirect(new URL("/cashier", request.url));
      }
    }
    return NextResponse.next();
  }

  // 2. Owner route protection: only OWNER
  if (pathname.startsWith("/owner")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login?callback=" + encodeURIComponent(pathname), request.url));
    }
    if (session.role !== "OWNER") {
      // Cashier trying to access Owner area -> redirect to cashier
      return NextResponse.redirect(new URL("/cashier", request.url));
    }
    return NextResponse.next();
  }

  // 3. Cashier route protection: CASHIER or OWNER
  if (pathname.startsWith("/cashier")) {
    if (!session) {
      return NextResponse.redirect(new URL("/login?callback=" + encodeURIComponent(pathname), request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/owner/:path*", "/cashier/:path*", "/login"],
};
