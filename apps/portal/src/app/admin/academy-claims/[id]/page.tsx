import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ClaimStatus } from "@prisma/client";
import { ArrowLeft, CheckCircle2, ExternalLink, ShieldCheck, XCircle } from "lucide-react";
import { Button } from "@/app/_components/Button";
import { PageShell } from "@/app/_components/Page";
import { getCurrentUser, isPlatformAdminRole } from "@/lib/admin";
import { approveAcademyClaim, rejectAcademyClaim } from "../actions";
import { fetchAcademyClaim, type AcademyClaimDetail } from "../api";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "RollFinders | Academy Claim Review",
  description: "Review academy claim evidence and decide access.",
};

type DetailSearchParams = Record<string, string | string[] | undefined>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AcademyClaimDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<DetailSearchParams>;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");
  if (!isPlatformAdminRole(currentUser.role)) redirect("/");

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const result = await fetchAcademyClaim(id);
  const decision = firstParam(query.decision);
  const error = firstParam(query.error);
  const returnTo = safeClaimsReturnTo(firstParam(query.returnTo));

  if (!result.ok && result.status === 404) notFound();

  return (
    <PageShell>
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link href={returnTo} className="inline-flex items-center gap-2 text-sm font-bold text-teal-800">
          <ArrowLeft size={16} aria-hidden />
          Academy Claims
        </Link>

        {!result.ok ? (
          <ErrorState message={result.message} returnTo={returnTo} status={result.status} />
        ) : (
          <ClaimDetail claim={result.data} decision={decision} error={error} returnTo={returnTo} />
        )}
      </section>
    </PageShell>
  );
}

function safeClaimsReturnTo(value?: string) {
  return value?.startsWith("/admin?panel=academy-claims") ? value : "/admin?panel=academy-claims";
}

function ClaimDetail({ claim, decision, error, returnTo }: { claim: AcademyClaimDetail; decision?: string; error?: string; returnTo: string }) {
  const pending = claim.status === ClaimStatus.PENDING;

  return (
    <>
      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Claim Review</p>
          <h1 className="mt-2 text-3xl font-black text-stone-950">{claim.academy.name}</h1>
          <p className="mt-2 max-w-3xl text-stone-700">Review the requester&apos;s operational authority evidence before granting academy management access.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={claim.status} />
          {claim.academy.slug ? <Button href={`/academies/${claim.academy.slug}`} variant="secondary">Public Profile</Button> : null}
        </div>
      </div>

      {decision === "approved" ? <Notice tone="success" message="Claim approved and academy access is being processed." /> : null}
      {decision === "rejected" ? <Notice tone="danger" message="Claim rejected and the requester notification is being processed." /> : null}
      {error ? <Notice tone="danger" message={error} /> : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-5">
          <Section title="Academy">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Name" value={claim.academy.name} />
              <Info label="Location" value={[claim.academy.city, claim.academy.postcode].filter(Boolean).join(", ") || "Not supplied"} />
              <Info label="Address" value={claim.academy.address ?? "Not supplied"} />
              <Info label="Website" value={claim.academy.website ?? "Not supplied"} />
              <Info label="Email" value={claim.academy.email ?? "Not supplied"} />
              <Info label="Phone" value={claim.academy.phone ?? "Not supplied"} />
            </div>
          </Section>

          <Section title="Requester">
            <div className="grid gap-4 sm:grid-cols-2">
              <Info label="Name" value={claim.requester.name} />
              <Info label="Email" value={claim.requester.email} />
              <Info label="Phone" value={claim.requester.phone ?? "Not supplied"} />
              <Info label="Role at Academy" value={claimRoleLabel(claim.requester.role)} />
            </div>
          </Section>

          <Section title="Verification Evidence">
            <div className="grid gap-4">
              <Info label="Verification Notes" value={claim.verificationNotes ?? "No verification notes supplied."} preserveWhitespace />
              {claim.publicProofLink ? (
                <a href={claim.publicProofLink} target="_blank" rel="noreferrer" className="inline-flex w-fit items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-sm font-bold text-teal-800 hover:bg-teal-50">
                  Open proof link
                  <ExternalLink size={16} aria-hidden />
                </a>
              ) : (
                <Info label="Proof Link" value="Not supplied" />
              )}
            </div>
          </Section>

          <Section title="Self-Attested BJJ Context">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-950">
              Belt context is optional, self-attested, and private to admin review. It is not ownership, identity, coaching authority, or approval evidence by itself.
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Info label="Self-Attested Belt Rank" value={claim.requester.beltRank ? claimRoleLabel(claim.requester.beltRank) : "Not supplied"} />
              <Info label="Self-Attested Stripes" value={claim.requester.beltStripes === null || claim.requester.beltStripes === undefined ? "Not supplied" : String(claim.requester.beltStripes)} />
            </div>
          </Section>
        </div>

        <aside className="grid content-start gap-5">
          <Section title="Review Metadata">
            <div className="grid gap-4">
              <Info label="Status" value={claimStatusLabel(claim.status)} />
              <Info label="Submitted" value={formatDateTime(claim.createdAt)} />
              <Info label="Reviewed" value={claim.reviewedAt ? formatDateTime(claim.reviewedAt) : "Not reviewed"} />
              <Info label="Reviewed By" value={claim.reviewedBy?.email ?? claim.reviewedBy?.name ?? "Not reviewed"} />
              <Info label="Linked User" value={claim.linkedUserId ?? "Not linked"} />
              {claim.rejectionReason ? <Info label="Rejection Reason" value={claim.rejectionReason} preserveWhitespace /> : null}
            </div>
          </Section>

          {pending ? (
            <Section title="Decision">
              <div className="grid gap-4">
                <form action={approveAcademyClaim.bind(null, claim.id)}>
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <Button type="submit" variant="primary" className="w-full">
                    <CheckCircle2 size={18} aria-hidden />
                    Approve Claim
                  </Button>
                </form>
                <form action={rejectAcademyClaim.bind(null, claim.id)} className="grid gap-3">
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <label className="grid gap-2 text-sm font-bold text-slate-800">
                    Rejection reason
                    <textarea name="rejectionReason" required rows={5} className="w-full resize-y rounded-md border border-stone-300 px-3 py-2 text-sm font-normal leading-6 text-slate-900" />
                  </label>
                  <Button type="submit" variant="danger" className="w-full">
                    <XCircle size={18} aria-hidden />
                    Reject Claim
                  </Button>
                </form>
              </div>
            </Section>
          ) : (
            <Section title="Decision">
              <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50 p-4 text-sm font-semibold leading-6 text-stone-700">
                <ShieldCheck className="mt-0.5 shrink-0 text-stone-500" size={18} aria-hidden />
                This claim has already been reviewed. Approval and rejection actions are only available for pending claims.
              </div>
            </Section>
          )}
        </aside>
      </div>
    </>
  );
}

function ErrorState({ message, returnTo, status }: { message: string; returnTo: string; status: number }) {
  const title = status === 403 ? "Access restricted" : "Claim unavailable";
  return (
    <div className="mt-6 rounded-lg border border-stone-200 bg-white px-5 py-12 text-center shadow-sm">
      <h1 className="text-2xl font-black text-slate-950">{title}</h1>
      <p className="mx-auto mt-2 max-w-xl text-slate-600">{message}</p>
      <Button href={returnTo} variant="secondary" className="mt-5">Back to Claims</Button>
    </div>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-stone-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Info({ label, preserveWhitespace, value }: { label: string; preserveWhitespace?: boolean; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className={`mt-1 break-words font-semibold leading-6 text-stone-950 ${preserveWhitespace ? "whitespace-pre-wrap" : ""}`}>{value}</p>
    </div>
  );
}

function Notice({ message, tone }: { message: string; tone: "danger" | "success" }) {
  const className = tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";
  return <div className={`mt-5 rounded-lg border p-4 text-sm font-bold ${className}`}>{message}</div>;
}

function StatusBadge({ status }: { status: ClaimStatus }) {
  const className = {
    [ClaimStatus.PENDING]: "bg-amber-50 text-amber-800 ring-amber-100",
    [ClaimStatus.APPROVED]: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    [ClaimStatus.REJECTED]: "bg-red-50 text-red-700 ring-red-100",
  }[status];

  return <span className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-black ring-1 ${className}`}>{claimStatusLabel(status)}</span>;
}

function claimRoleLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function claimStatusLabel(status: ClaimStatus) {
  return claimRoleLabel(status);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
