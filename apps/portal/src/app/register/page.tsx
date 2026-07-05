import type { Metadata } from "next";
import Link from "next/link";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/Page";
import { findAcademyBySlugFromAcademyService, getAcademyFromAcademyService, listAcademiesFromAcademyService, type AcademyServiceRecord } from "@/lib/academyService";
import { registerPractitioner } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Join Your Academy",
  description: "Create a practitioner account and connect it to your academy.",
};

type RegisterSearchParams = {
  academy?: string | string[];
  academyId?: string | string[];
  error?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function selectedAcademy(params: RegisterSearchParams) {
  const academyId = firstParam(params.academyId);
  if (academyId) return getAcademyFromAcademyService(academyId);

  const slug = firstParam(params.academy);
  if (slug) return findAcademyBySlugFromAcademyService(slug);

  return null;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<RegisterSearchParams>;
}) {
  const params = await searchParams;
  const academy = await selectedAcademy(params);
  const academyOptions = academy ? [] : academySelectOptions(await listAcademiesFromAcademyService({ limit: 100 }));
  const error = firstParam(params.error);

  return (
    <PageShell>
      <section className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-7 sm:px-6 md:py-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:py-12">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Practitioner account</p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">Join your academy on RollFinders</h1>
          <p className="mt-3 max-w-2xl text-stone-700">
            Create your own account and connect it to your academy if an admin has not created one for you yet.
          </p>

          {error ? (
            <p role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold leading-6 break-words text-red-800">
              {error}
            </p>
          ) : null}

          <form action={registerPractitioner} className="mt-5 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            {academy ? (
              <SelectedAcademy academy={academy} />
            ) : (
              <AutoCompleteTextField
                emptyMessage="No academies matched that search."
                label="Find your academy"
                name="academyId"
                options={academyOptions}
                placeholder="Search by academy name, city, or postcode"
                size="lg"
              />
            )}
            <input type="hidden" name="academySlug" value={academy?.slug ?? ""} />

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
                First name
                <input name="firstName" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
                Last name
                <input name="lastName" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
              </label>
            </div>
            <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
              Email
              <input name="email" type="email" required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
                Password
                <input name="password" type="password" minLength={5} required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
              </label>
              <label className="grid gap-1.5 text-sm font-semibold text-stone-800">
                Confirm password
                <input name="confirmPassword" type="password" minLength={5} required className="min-h-12 rounded-md border border-stone-300 bg-stone-50 px-3 text-base font-normal text-stone-950 focus:border-teal-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-700/20" />
              </label>
            </div>
            <Button type="submit" variant="primary" className="min-h-12 w-full">
              Create account
            </Button>
          </form>
        </div>

        <aside className="h-fit rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-black text-stone-950">Already have an account?</h2>
          <p className="mt-2 text-sm leading-6 text-stone-700">
            Sign in and ask your academy admin to add your existing account if it is not connected yet.
          </p>
          <Button href="/login" variant="secondary" className="mt-4 w-full">
            Sign in
          </Button>
        </aside>
      </section>
    </PageShell>
  );
}

function SelectedAcademy({ academy }: { academy: AcademyServiceRecord }) {
  return (
    <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-950">
      <input type="hidden" name="academyId" value={academy.id} />
      <p className="font-black">{academy.name}</p>
      <p>{[academy.city, academy.postcode].filter(Boolean).join(", ")}</p>
      <Link href="/register" className="mt-2 inline-flex text-sm font-bold text-teal-900 underline-offset-4 hover:underline">
        Choose a different academy
      </Link>
    </div>
  );
}

function academySelectOptions(academies: AcademyServiceRecord[]): AutoCompleteTextFieldOption[] {
  return academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
    description: [academy.city, academy.postcode].filter(Boolean).join(", "),
    meta: [academy.slug, academy.city, academy.postcode].filter(Boolean).join(" "),
  }));
}
