import { Role, type Academy, type Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser, isStandardUserRole } from "./admin";
import { prisma } from "./prisma";

type DashboardUser = Prisma.UserGetPayload<{ include: { academy: true } }> & { role: Role };
type StandardDashboardResult = { user: DashboardUser; academy: Academy };
type PlatformDashboardResult = { user: DashboardUser; academy: Academy | null };

export async function requireStandardDashboardUser(): Promise<StandardDashboardResult>;
export async function requireStandardDashboardUser(options: { allowPlatformAdmin: true }): Promise<PlatformDashboardResult>;
export async function requireStandardDashboardUser(options: { allowPlatformAdmin?: boolean } = {}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const platformAdmin = options.allowPlatformAdmin === true && user.role === Role.PLATFORM_ADMIN;
  if (!isStandardUserRole(user.role) && !platformAdmin) redirect("/admin");

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    include: { academy: true },
  });

  if (!account) redirect("/login");

  const fallbackMembership = account.academy
    ? null
    : await prisma.academyMember.findFirst({
        where: { userId: user.id },
        include: { academy: true },
        orderBy: { createdAt: "asc" },
      });
  const academy = account.academy ?? fallbackMembership?.academy;
  if (!academy && !platformAdmin) redirect("/");

  return { user: { ...account, role: account.role as Role }, academy: academy ?? null };
}

export function memberSearchWhere(academyId: string, query: string) {
  const search = query.trim();
  return {
    academyId,
    role: { in: [Role.STANDARD_USER, Role.USER] },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };
}
