import { Role, UserStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser, isStandardUserRole } from "./admin";
import { prisma } from "./prisma";

type ServiceUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function getDashboardShadowAccount(user: ServiceUser) {
  const academy = user.academyId
    ? await prisma.academy.findUnique({ where: { id: user.academyId } })
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
  if (!user) redirect("/login");

  const account = await getDashboardShadowAccount(user);

  const fallbackMembership = account.academy
    ? null
    : await prisma.academyMember.findFirst({
        where: { userId: account.id },
        include: { academy: true },
        orderBy: { createdAt: "asc" },
      });

  return { user: account, academy: account.academy ?? fallbackMembership?.academy ?? null };
}

export async function requireStandardDashboardUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStandardUserRole(user.role)) redirect("/dashboard");

  const account = await getDashboardShadowAccount(user);

  const fallbackMembership = account.academy
    ? null
    : await prisma.academyMember.findFirst({
        where: { userId: account.id },
        include: { academy: true },
        orderBy: { createdAt: "asc" },
      });
  const academy = account.academy ?? fallbackMembership?.academy;
  if (!academy) redirect("/login");

  return { user: account, academy };
}

export function memberSearchWhere(academyId: string, query: string) {
  const search = query.trim();
  return {
    academyId,
    ...(search ? { userId: { contains: search, mode: "insensitive" as const } } : {}),
  };
}
