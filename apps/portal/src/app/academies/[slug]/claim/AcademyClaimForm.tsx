"use client";

import { useMemo, useState } from "react";
import { Button } from "@/app/_components/Button";

type ClaimField =
  | "academyId"
  | "requesterName"
  | "requesterEmail"
  | "requesterPhone"
  | "requesterRole"
  | "requesterBeltRank"
  | "requesterBeltStripes"
  | "verificationNotes"
  | "publicProofLink";

type ClaimFieldErrors = Partial<Record<ClaimField, string[]>>;

type ClaimFormValues = Record<ClaimField, string>;

type ApiErrorResponse = {
  error?: string;
  message?: string;
  fieldErrors?: ClaimFieldErrors;
};

type SubmitState = {
  status: "idle" | "submitting" | "success" | "error";
  message: string;
  fieldErrors: ClaimFieldErrors;
};

const initialValues: ClaimFormValues = {
  academyId: "",
  requesterName: "",
  requesterEmail: "",
  requesterPhone: "",
  requesterRole: "",
  requesterBeltRank: "",
  requesterBeltStripes: "",
  verificationNotes: "",
  publicProofLink: "",
};

const requesterRoles = [
  ["OWNER", "Owner"],
  ["HEAD_COACH", "Head coach"],
  ["MANAGER", "Manager"],
  ["STAFF", "Staff"],
  ["OTHER", "Other"],
] as const;

const beltRanks = [
  ["WHITE", "White"],
  ["BLUE", "Blue"],
  ["PURPLE", "Purple"],
  ["BROWN", "Brown"],
  ["BLACK", "Black"],
  ["CORAL", "Coral"],
  ["RED", "Red"],
  ["OTHER", "Other"],
] as const;

const ranksWithStripes = new Set(["WHITE", "BLUE", "PURPLE", "BROWN"]);

function hasErrors(errors?: string[]) {
  return Boolean(errors?.length);
}

function valueOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function errorMessage(response: Response, data: ApiErrorResponse) {
  if (data.message) return data.message;
  if (data.error && data.error !== "Validation failed") return data.error;
  if (response.status === 409) return "This academy already has a pending claim from this email, or the listing is already managed.";
  if (response.status === 404) return "We could not find this academy. Return to the academy profile and try again.";
  if (response.status === 429) return "Too many claim attempts were submitted. Please wait a while and try again.";
  return "We could not submit the claim. Check the highlighted fields and try again.";
}

function fieldErrorId(name: ClaimField) {
  return `${name}-error`;
}

export function AcademyClaimForm({ academyId, academyName, academySlug }: { academyId: string; academyName: string; academySlug: string }) {
  const [values, setValues] = useState<ClaimFormValues>({ ...initialValues, academyId });
  const [state, setState] = useState<SubmitState>({ status: "idle", message: "", fieldErrors: {} });

  const stripeRankAllowed = useMemo(() => ranksWithStripes.has(values.requesterBeltRank), [values.requesterBeltRank]);
  const isSubmitting = state.status === "submitting";

  function updateField(name: ClaimField, value: string) {
    setValues((current) => {
      if (name === "requesterBeltRank" && !ranksWithStripes.has(value)) {
        return { ...current, requesterBeltRank: value, requesterBeltStripes: "" };
      }

      return { ...current, [name]: value };
    });
    setState((current) => ({
      ...current,
      fieldErrors: { ...current.fieldErrors, [name]: undefined },
    }));
  }

  async function handleSubmit(formData: FormData) {
    const nextValues = { ...values, academyId };
    for (const field of Object.keys(nextValues) as ClaimField[]) {
      nextValues[field] = String(formData.get(field) ?? "");
    }
    nextValues.academyId = academyId;
    setValues(nextValues);
    setState({ status: "submitting", message: "", fieldErrors: {} });

    const payload = {
      academyId,
      requesterName: nextValues.requesterName.trim(),
      requesterEmail: nextValues.requesterEmail.trim(),
      requesterRole: nextValues.requesterRole,
      verificationNotes: nextValues.verificationNotes.trim(),
      requesterPhone: valueOrUndefined(nextValues.requesterPhone),
      publicProofLink: valueOrUndefined(nextValues.publicProofLink),
      requesterBeltRank: valueOrUndefined(nextValues.requesterBeltRank),
      requesterBeltStripes: nextValues.requesterBeltStripes === "" ? undefined : Number(nextValues.requesterBeltStripes),
    };

    const response = await fetch("/api/academy-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let data: ApiErrorResponse = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      setState({
        status: "error",
        message: errorMessage(response, data),
        fieldErrors: data.fieldErrors ?? {},
      });
      return;
    }

    setState({
      status: "success",
      message: `Your claim for ${academyName} has been submitted for admin review. Access is not immediate, and RollFinders may contact you if more information is needed.`,
      fieldErrors: {},
    });
  }

  if (state.status === "success") {
    return (
      <div className="mt-6 rounded-lg border border-teal-200 bg-teal-50 p-5">
        <p className="text-sm font-bold uppercase tracking-wide text-teal-800">Claim submitted</p>
        <h2 className="mt-2 text-2xl font-black text-stone-950">Thanks, we have your request.</h2>
        <p className="mt-3 leading-7 text-stone-700">{state.message}</p>
        <Button href={`/academies/${academySlug}`} variant="neutral" className="mt-4">
          Back to academy profile
        </Button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} noValidate className="mt-6 grid gap-5 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
      <input type="hidden" name="academyId" value={academyId} />

      {state.message ? (
        <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p>
      ) : null}

      <div className="rounded-md border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm font-bold text-stone-950">Claiming {academyName}</p>
        <p className="mt-1 text-sm leading-6 text-stone-700">
          This form is locked to this academy profile. Claim details are reviewed by platform admins before any management access is granted.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="requesterName" label="Your name" value={values.requesterName} errors={state.fieldErrors.requesterName} onChange={updateField} />
        <Field name="requesterEmail" label="Email" type="email" value={values.requesterEmail} errors={state.fieldErrors.requesterEmail} onChange={updateField} />
        <Field name="requesterPhone" label="Phone" required={false} value={values.requesterPhone} errors={state.fieldErrors.requesterPhone} onChange={updateField} />
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Role at academy <span className="text-xs font-bold text-red-700">Required</span>
          <select
            name="requesterRole"
            value={values.requesterRole}
            onChange={(event) => updateField("requesterRole", event.target.value)}
            aria-invalid={hasErrors(state.fieldErrors.requesterRole) ? "true" : undefined}
            aria-describedby={hasErrors(state.fieldErrors.requesterRole) ? fieldErrorId("requesterRole") : undefined}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-base font-normal aria-invalid:border-red-500"
          >
            <option value="">Select role</option>
            {requesterRoles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <FieldError name="requesterRole" errors={state.fieldErrors.requesterRole} />
        </label>
      </div>

      <div className="grid gap-4 rounded-md border border-stone-200 bg-stone-50 p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <p className="text-sm font-bold text-stone-950">Optional BJJ context</p>
          <p className="mt-1 text-sm leading-6 text-stone-700">
            Belt rank and stripes are optional, self-attested context for admins. They are not proof of academy ownership, identity, coaching authority, or approval eligibility.
          </p>
        </div>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Belt rank <span className="text-xs font-bold text-stone-500">Optional</span>
          <select
            name="requesterBeltRank"
            value={values.requesterBeltRank}
            onChange={(event) => updateField("requesterBeltRank", event.target.value)}
            aria-invalid={hasErrors(state.fieldErrors.requesterBeltRank) ? "true" : undefined}
            aria-describedby={hasErrors(state.fieldErrors.requesterBeltRank) ? fieldErrorId("requesterBeltRank") : undefined}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-base font-normal aria-invalid:border-red-500"
          >
            <option value="">No belt context</option>
            {beltRanks.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <FieldError name="requesterBeltRank" errors={state.fieldErrors.requesterBeltRank} />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Stripes <span className="text-xs font-bold text-stone-500">Optional</span>
          <select
            name="requesterBeltStripes"
            value={values.requesterBeltStripes}
            onChange={(event) => updateField("requesterBeltStripes", event.target.value)}
            disabled={!stripeRankAllowed}
            aria-invalid={hasErrors(state.fieldErrors.requesterBeltStripes) ? "true" : undefined}
            aria-describedby={hasErrors(state.fieldErrors.requesterBeltStripes) ? fieldErrorId("requesterBeltStripes") : undefined}
            className="min-h-11 rounded-md border border-stone-300 bg-white px-3 text-base font-normal disabled:bg-stone-100 disabled:text-stone-500 aria-invalid:border-red-500"
          >
            <option value="">{stripeRankAllowed ? "No stripe context" : "Only for white, blue, purple, or brown"}</option>
            {[0, 1, 2, 3, 4].map((stripeCount) => <option key={stripeCount} value={stripeCount}>{stripeCount}</option>)}
          </select>
          <FieldError name="requesterBeltStripes" errors={state.fieldErrors.requesterBeltStripes} />
        </label>
      </div>

      <Field name="publicProofLink" label="Public proof link" type="url" required={false} value={values.publicProofLink} errors={state.fieldErrors.publicProofLink} onChange={updateField} />

      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Verification notes <span className="text-xs font-bold text-red-700">Required</span>
        <textarea
          name="verificationNotes"
          value={values.verificationNotes}
          onChange={(event) => updateField("verificationNotes", event.target.value)}
          aria-invalid={hasErrors(state.fieldErrors.verificationNotes) ? "true" : undefined}
          aria-describedby={hasErrors(state.fieldErrors.verificationNotes) ? fieldErrorId("verificationNotes") : undefined}
          className="min-h-40 rounded-md border border-stone-300 px-3 py-2 text-base font-normal aria-invalid:border-red-500"
        />
        <span className="text-xs font-semibold text-stone-500">
          Include public, operational evidence such as an academy website contact page, official academy email, Instagram profile or post, and a short explanation of your ownership, coaching, or management role. Do not send passports, financial documents, or unnecessary private identity documents.
        </span>
        <FieldError name="verificationNotes" errors={state.fieldErrors.verificationNotes} />
      </label>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
        <Button href={`/academies/${academySlug}`} variant="subtle">Cancel</Button>
        <Button type="submit" variant="primary" disabled={isSubmitting}>{isSubmitting ? "Submitting..." : "Submit claim"}</Button>
      </div>
    </form>
  );
}

function Field({
  errors,
  label,
  name,
  onChange,
  required = true,
  type = "text",
  value,
}: {
  errors?: string[];
  label: string;
  name: ClaimField;
  onChange: (name: ClaimField, value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label} <span className={`text-xs font-bold ${required ? "text-red-700" : "text-stone-500"}`}>{required ? "Required" : "Optional"}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(name, event.target.value)}
        aria-invalid={hasErrors(errors) ? "true" : undefined}
        aria-describedby={hasErrors(errors) ? fieldErrorId(name) : undefined}
        className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500"
      />
      <FieldError name={name} errors={errors} />
    </label>
  );
}

function FieldError({ errors, name }: { errors?: string[]; name: ClaimField }) {
  if (!errors?.length) return null;
  return <span id={fieldErrorId(name)} className="text-xs font-semibold text-red-700">{errors.join(" ")}</span>;
}
