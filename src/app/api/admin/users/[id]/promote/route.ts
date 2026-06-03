import { mutateUser } from "../user-action";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return mutateUser(id, "promote");
}
