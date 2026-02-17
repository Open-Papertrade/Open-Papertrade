import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const publicPaths = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and internal paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check maintenance status
  try {
    const res = await fetch(`${API_BASE_URL}/maintenance-status/`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = await res.json();
      if (data.enabled && pathname !== "/maintenance") {
        return NextResponse.redirect(new URL("/maintenance", request.url));
      }
      if (!data.enabled && pathname === "/maintenance") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  } catch {
    // If backend is unreachable, skip maintenance check and proceed normally
  }

  // If we're on the maintenance page and got here, allow it
  if (pathname === "/maintenance") {
    return NextResponse.next();
  }

  // Allow public paths
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authActive = request.cookies.get("auth_active");
  if (!authActive?.value) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
