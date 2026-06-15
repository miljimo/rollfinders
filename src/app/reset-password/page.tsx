import { notFound, redirect } from "next/navigation";

export default async function ResetPasswordTokenQueryPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const params = await searchParams;
  const token = Array.isArray(params.token) ? params.token[0] : params.token;
  if (!token) notFound();

  redirect(`/reset-password/${encodeURIComponent(token)}`);
}
