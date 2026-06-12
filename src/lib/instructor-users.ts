import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type InstructorUserOption = {
  id: string;
  name: string | null;
  email: string;
  academyIds: string[];
};

export function instructorUserAcademyWhere(academyIds: string[]): Prisma.UserWhereInput {
  return {
    OR: [
      { academyId: { in: academyIds } },
      { academyMemberships: { some: { academyId: { in: academyIds } } } },
    ],
  };
}

export async function getInstructorUserOptions(userWhere: Prisma.UserWhereInput): Promise<InstructorUserOption[]> {
  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      academyId: true,
      academyMemberships: { select: { academyId: true } },
    },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    academyIds: Array.from(new Set([
      ...(user.academyId ? [user.academyId] : []),
      ...user.academyMemberships.map((membership) => membership.academyId),
    ])),
  }));
}
