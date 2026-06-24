import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Claims",
  description: "Review pending academy ownership claims.",
};

type ClaimSearchParams = Record<string, string | string[] | undefined>;

export default async function AcademyClaimsCompatibilityPage({
  searchParams,
}: {
  searchParams: Promise<ClaimSearchParams>;
}) {
  const params = new URLSearchParams();
  params.set("panel", "academy-claims");

  Object.entries(await searchParams).forEach(([key, value]) => {
    if (!value || key === "panel") return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && params.append(key, item));
      return;
    }
    params.set(key, value);
  });

  redirect(`/admin?${params.toString()}`);
}
