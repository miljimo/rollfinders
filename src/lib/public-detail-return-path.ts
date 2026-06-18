function isAllowedPublicDetailReturnPath(pathname: string) {
  return pathname === "/dashboard"
    || pathname.startsWith("/dashboard/")
    || pathname === "/courses"
    || pathname.startsWith("/courses/")
    || pathname === "/open-mats"
    || pathname.startsWith("/open-mats/")
    || pathname === "/academies"
    || pathname.startsWith("/academies/");
}

export function publicDetailReturnPath(returnTo: string | undefined, fallback: string) {
  const trimmed = returnTo?.trim() ?? "";
  if (!trimmed || trimmed.startsWith("//")) return fallback;

  try {
    const url = new URL(trimmed, "http://rollfinders.local");
    if (url.origin !== "http://rollfinders.local") return fallback;
    if (!isAllowedPublicDetailReturnPath(url.pathname)) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}

export function publicDetailDashboardDialogPath(returnTo: string | undefined, eventId: string) {
  const target = publicDetailReturnPath(returnTo, "");
  if (!target) return null;

  const url = new URL(target, "http://rollfinders.local");
  if (url.pathname !== "/dashboard" || url.searchParams.get("panel") !== "open-mats") return null;

  url.searchParams.set("panel", "open-mats");
  url.searchParams.set("dialog", "view-event");
  url.searchParams.set("eventId", eventId);
  return `${url.pathname}${url.search}`;
}
