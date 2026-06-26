import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import { loginUrl, publicSiteBaseUrl } from "./lib/auth-urls";

const adminRoles = new Set(["SUPER_ADMIN", "ADMIN", "PLATFORM_ADMIN", "ACADEMY_ADMIN", "ACADEMY_OWNER"]);
const standardDashboardRoles = new Set(["STANDARD_USER", "USER"]);

function loginRedirect(request: NextRequest) {
  const publicBaseUrl = publicSiteBaseUrl();
  const redirectTarget = publicBaseUrl
    ? new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, `${publicBaseUrl}/`).toString()
    : new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, request.url).toString();
  const url = new URL(loginUrl(redirectTarget), request.url);
  return NextResponse.redirect(url);
}

function dashboardPanelRedirect(request: NextRequest, panel: string, searchKey?: string) {
  const url = new URL("/dashboard", request.url);
  url.searchParams.set("panel", panel);
  if (searchKey) {
    const searchValue = request.nextUrl.searchParams.get(searchKey);
    if (searchValue) url.searchParams.set("search", searchValue);
  }
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  const role = typeof token?.role === "string" ? token.role : null;
  const path = request.nextUrl.pathname;

  if (!token) return loginRedirect(request);

  if (path.startsWith("/dashboard/password")) {
    const url = new URL("/dashboard", request.url);
    url.searchParams.set("panel", "settings");
    url.searchParams.set("settingsAction", "change-password");
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/dashboard/members")) {
    return dashboardPanelRedirect(request, standardDashboardRoles.has(role ?? "") ? "members" : "users", "q");
  }

  if (path.startsWith("/admin") && !adminRoles.has(role ?? "")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
