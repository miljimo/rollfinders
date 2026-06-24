const localLoginPath = "/login";
const defaultDashboardPath = "/dashboard";

function cleanBaseUrl(value: string | undefined) {
  return value?.trim().replace(/\/+$/, "") || "";
}

export function authPortalBaseUrl() {
  return cleanBaseUrl(process.env.AUTH_PORTAL_ORIGIN ?? process.env.AUTH_PUBLIC_BASE_URL ?? process.env.NEXT_PUBLIC_AUTH_BASE_URL);
}

export function publicSiteBaseUrl() {
  return cleanBaseUrl(process.env.PUBLIC_SITE_ORIGIN ?? process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL);
}

export function loginUrl(redirectTarget = defaultDashboardPath) {
  const url = authPortalBaseUrl()
    ? new URL(localLoginPath, `${authPortalBaseUrl()}/`)
    : new URL(localLoginPath, "http://localhost");

  url.searchParams.set("redirect", redirectTarget);

  return authPortalBaseUrl() ? url.toString() : `${url.pathname}${url.search}`;
}

export function logoutCallbackUrl() {
  return authPortalBaseUrl() ? `${authPortalBaseUrl()}${localLoginPath}` : localLoginPath;
}

export function allowedAuthRedirectOrigins(baseUrl: string) {
  return [
    new URL(baseUrl).origin,
    authPortalBaseUrl(),
    publicSiteBaseUrl(),
  ].filter(Boolean).map((url) => new URL(url).origin);
}
