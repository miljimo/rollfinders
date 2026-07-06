import { redirect } from "next/navigation";

type OpenMatSearchParams = Record<string, string | string[] | undefined>;

export default async function OpenMatsPage({ searchParams }: { searchParams: Promise<OpenMatSearchParams> }) {
  const params = await searchParams;
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
      return;
    }
    query.set(key, value);
  });

  redirect(query.size ? `/?${query.toString()}` : "/");
}
