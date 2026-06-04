import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { getCurrentUser, isStandardUserRole } from "./admin";
import { prisma } from "./prisma";

export async function requireStandardDashboardUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!isStandardUserRole(user.role)) redirect("/admin");

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
  if (!academy) redirect("/");

  return { user: { ...account, role: account.role as Role }, academy };
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
