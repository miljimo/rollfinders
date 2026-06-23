import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

const adminRoles = new Set(["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "ACADEMY_ADMIN", "ACADEMY_OWNER"]);
const standardDashboardRoles = new Set(["STANDARD_USER", "USER"]);

function loginRedirect(request: NextRequest) {
  return NextResponse.redirect(new URL("/login", request.url));
}

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = typeof token?.role === "string" ? token.role : null;
  const path = request.nextUrl.pathname;

  if (!token) return loginRedirect(request);

  if (path.startsWith("/admin") && !adminRoles.has(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (path.startsWith("/dashboard/members") && !standardDashboardRoles.has(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
