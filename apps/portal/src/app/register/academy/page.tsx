import type { Metadata } from "next";
import { AcademyForm } from "@/app/admin/academies/AcademyForm";
import { PageShell } from "@/app/_components/Page";
import { createPublicAcademy } from "./actions";

export const metadata: Metadata = {
  title: "RollFinders | Register Your Academy",
  description: "Register or claim your academy or dojo on RollFinders.",
};

export const dynamic = "force-dynamic";

export default function RegisterAcademyPage() {
  return (
    <PageShell>
      <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-12">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">
          Academy registration
        </p>
        <h1 className="mt-2 text-3xl font-black text-stone-950 md:text-4xl">
          Register your academy or dojo
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-stone-700">
          Create a public academy profile with a contact email we can verify
          after the listing is submitted. Creating this listing does not grant
          ownership; the academy owner still needs to complete the claim review
          afterwards.
        </p>

        <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
          <h2 className="text-2xl font-black text-stone-950">
            Create a public academy listing
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-700">
            Use this form only when the academy is not already listed. After the
            profile is created, we send a verification code to the academy
            contact email.
          </p>
          <AcademyForm
            action={createPublicAcademy}
            canManagePlatformFields={false}
            cancelHref="/login"
            geocodeEndpoint="/api/public/geocode"
            returnTo="/register/academy"
          />
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
