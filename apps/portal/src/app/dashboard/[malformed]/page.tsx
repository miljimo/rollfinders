import { redirect } from "next/navigation";

type MalformedDashboardParams = {
  malformed: string;
};

type MalformedDashboardSearchParams = Record<string, string | string[] | undefined>;

const dashboardRouteAliases: Record<string, string> = {
  academies: "/dashboard/academies",
  "academy-claims": "/dashboard/academy-claims",
  "academy-review": "/dashboard/academy-review",
  analytics: "/dashboard/analytics",
  bookings: "/dashboard/bookings",
  courses: "/dashboard/courses",
  payment: "/dashboard/payment",
  payments: "/dashboard/payment",
  users: "/dashboard/users",
  wallet: "/dashboard/wallet",
};

function appendSearchParams(params: URLSearchParams, searchParams: MalformedDashboardSearchParams) {
  Object.entries(searchParams).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });
}

function malformedRouteRedirect(segment: string, searchParams: MalformedDashboardSearchParams) {
  const decodedSegment = decodeURIComponent(segment);
  const [routeName, ...queryParts] = decodedSegment.split("&");
  const routePath = dashboardRouteAliases[routeName];
  if (!routePath || queryParts.length === 0) return null;

  const params = new URLSearchParams();
  appendSearchParams(params, searchParams);
  queryParts.forEach((part) => {
    const [rawKey, ...rawValueParts] = part.split("=");
    if (!rawKey) return;
    params.set(rawKey, rawValueParts.join("="));
  });

  const query = params.toString();
  return query ? `${routePath}?${query}` : routePath;
}

export default async function MalformedDashboardRoute({
  params,
  searchParams,
}: {
  params: Promise<MalformedDashboardParams>;
  searchParams: Promise<MalformedDashboardSearchParams>;
}) {
  const [{ malformed }, query] = await Promise.all([params, searchParams]);
  redirect(malformedRouteRedirect(malformed, query) ?? "/dashboard");
}
