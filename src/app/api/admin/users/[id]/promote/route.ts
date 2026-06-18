import { mutateUser } from "../user-action";
import { Role } from "@prisma/client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return mutateUser(id, "promote", Role.PLATFORM_ADMIN);
}
