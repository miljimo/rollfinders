const fallbackManagedUsersPath = "/admin/users";

function isAllowedManagedUsersReturnPath(pathname: string) {
  return pathname === "/dashboard"
    || pathname.startsWith("/dashboard/")
    || pathname === "/admin"
    || pathname.startsWith("/admin/");
}

export function managedUsersReturnPath(returnTo: string) {
  const trimmed = returnTo.trim();
  if (!trimmed || trimmed.startsWith("//")) return fallbackManagedUsersPath;

  try {
    const url = new URL(trimmed, "http://rollfinders.local");
    if (url.origin !== "http://rollfinders.local") return fallbackManagedUsersPath;
    if (!isAllowedManagedUsersReturnPath(url.pathname)) return fallbackManagedUsersPath;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallbackManagedUsersPath;
  }
}
