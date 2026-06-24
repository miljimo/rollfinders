import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Members",
  description: "Search members from your academy.",
};

type MemberParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StandardMembersPage({ searchParams }: { searchParams: Promise<MemberParams> }) {
  const params = await searchParams;
  const q = (firstParam(params.q) ?? "").trim();
  redirect(q ? `/dashboard?panel=members&search=${encodeURIComponent(q)}` : "/dashboard?panel=members");
}
