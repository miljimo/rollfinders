import { Role, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAcademyFromAcademyService, listAcademyMembershipsForUserFromAcademyService } from "./academyService";
import { getCurrentUser, isStandardUserRole } from "./admin";
import { loginUrl } from "./auth-urls";

type ServiceUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getDashboardShadowAccount(user: ServiceUser) {
  const academy = user.academyId
    ? await getAcademyFromAcademyService(user.academyId, user)
    : null;
  return {
    id: user.id,
    email: user.email,
    name: null,
    role: user.role as Role,
    academyId: user.academyId ?? null,
    status: UserStatus.ACTIVE,
    disabled: false,
    createdAt: new Date(),
    academy,
  };
}

export async function requireDashboardUser() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard"));

  const account = await getDashboardShadowAccount(user);

  const fallbackMembership = account.academy
    ? null
    : (await listAcademyMembershipsForUserFromAcademyService(account.id, user))[0];
  const fallbackAcademy = fallbackMembership ? await getAcademyFromAcademyService(fallbackMembership.academyId, user) : null;

  return { user: account, academy: account.academy ?? fallbackAcademy };
}

export async function requireStandardDashboardUser() {
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl("/dashboard"));
  if (!isStandardUserRole(user.role)) redirect("/dashboard");

  const account = await getDashboardShadowAccount(user);

  const fallbackMembership = account.academy
    ? null
    : (await listAcademyMembershipsForUserFromAcademyService(account.id, user))[0];
  const fallbackAcademy = fallbackMembership ? await getAcademyFromAcademyService(fallbackMembership.academyId, user) : null;
  const academy = account.academy ?? fallbackAcademy;
  if (!academy) redirect(loginUrl("/dashboard"));

  return { user: account, academy };
}

export function memberSearchWhere(academyId: string, query: string) {
  const search = query.trim();
  return {
    academyId,
    ...(search ? { userId: { contains: search, mode: "insensitive" as const } } : {}),
  };
}
