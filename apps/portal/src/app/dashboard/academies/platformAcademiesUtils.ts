type AdminSearchParams = Record<string, string | string[] | undefined>;

export const platformAdminAcademyPageSize = 5;

export function platformAdminAcademiesHref(searchParams: AdminSearchParams, overrides: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) value.forEach((item) => item && params.append(key, item));
    else params.set(key, value);
  });
  Object.entries(overrides).forEach(([key, value]) => {
    if (value === undefined || value === "" || value === 1) params.delete(key);
    else params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `/dashboard/academy-review?${query}` : "/dashboard/academy-review";
}

