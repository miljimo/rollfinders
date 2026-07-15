import type { Metadata } from "next";
import { Building2, Search, UserPlus } from "lucide-react";
import { Button } from "@/components/Button";
import { PageShell } from "@/components/Page";
import { LocationSearchForm } from "@/components/LocationSearchForm";

export const metadata: Metadata = {
  title: "RollFinders | Register Your Academy",
  description: "Register or claim your academy or dojo on RollFinders.",
};

export const dynamic = "force-dynamic";

export default function RegisterAcademyPage() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 md:py-12">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
          Academy registration
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
          Register your academy or dojo
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700">
          Start by checking whether your academy is already listed. Existing
          listings can be claimed for review, and new academies can contact
          RollFinders to create a public profile.
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="flex gap-3">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-800">
                <Search aria-hidden size={24} />
              </span>
              <div>
                <h2 className="text-xl font-black text-stone-950">
                  Find your academy first
                </h2>
                <p className="mt-1 text-sm leading-6 text-stone-700">
                  Search by academy name, town, postcode, or training style.
                  Open the academy profile and choose `Claim this academy` if it
                  is already listed.
                </p>
              </div>
            </div>
          </div>
          <div className="mt-5">
            <LocationSearchForm
              action="/academies"
              analyticsIntent="academy_search"
              autoLocate={false}
              placeholder="Search academy name, city, or postcode"
            />
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-teal-200 bg-teal-50/50 p-5">
            <span className="inline-flex size-12 items-center justify-center rounded-md bg-white text-teal-800">
              <Building2 aria-hidden size={24} />
            </span>
            <h2 className="mt-4 text-xl font-black text-stone-950">
              Already listed?
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Open your academy profile and submit a claim. RollFinders reviews
              claims before granting management access.
            </p>
            <Button
              href="/academies"
              variant="secondary"
              className="mt-4 w-full"
            >
              Browse Academies
            </Button>
          </section>

          <section className="rounded-lg border border-stone-200 bg-white p-5">
            <span className="inline-flex size-12 items-center justify-center rounded-md bg-stone-50 text-stone-800">
              <UserPlus aria-hidden size={24} />
            </span>
            <h2 className="mt-4 text-xl font-black text-stone-950">
              Not listed yet?
            </h2>
            <p className="mt-2 text-sm leading-6 text-stone-700">
              Send your academy details to RollFinders so a new profile can be
              reviewed and created.
            </p>
            <Button href="/contact" variant="primary" className="mt-4 w-full">
              Contact RollFinders
            </Button>
          </section>
        </div>

        <p className="mt-6 text-center text-sm font-semibold text-stone-700">
          Looking for your personal account?{" "}
          <a
            href="/register"
            className="text-teal-800 underline-offset-4 hover:underline"
          >
            Create User Account
          </a>
        </p>
      </section>
    </PageShell>
  );
}
