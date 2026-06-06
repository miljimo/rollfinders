"use client";

import Link from "next/link";
import Image from "next/image";
import type { Academy } from "@prisma/client";
import { AcademyVerificationStatus } from "@prisma/client";
import { type FormEvent, useActionState, useEffect, useMemo, useState } from "react";
import type { AcademyFormState } from "./actions";

type AcademyAction = (state: AcademyFormState, formData: FormData) => Promise<AcademyFormState>;

const initialAcademyFormState: AcademyFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

const steps = [
  { id: "basics", label: "Basics" },
  { id: "location", label: "Location" },
  { id: "media", label: "Media" },
  { id: "settings", label: "Settings" },
  { id: "review", label: "Review" },
] as const;

type StepId = typeof steps[number]["id"];

type AcademyValues = Record<string, string>;

const defaultValues: AcademyValues = {
  name: "",
  slug: "",
  description: "",
  affiliation: "",
  website: "",
  email: "",
  phone: "",
  address: "",
  city: "London",
  postcode: "",
  borough: "",
  country: "United Kingdom",
  latitude: "51.5072",
  longitude: "-0.1276",
  logoUrl: "",
  coverImageUrl: "",
  categories: "",
  facebookUrl: "",
  instagramUrl: "",
  xUrl: "",
  dropInPrice: "",
  giAvailable: "on",
  nogiAvailable: "on",
  beginnerFriendly: "on",
  competitionFocused: "off",
  featured: "off",
  verificationStatus: AcademyVerificationStatus.PENDING,
};

const fieldsByStep: Record<StepId, string[]> = {
  basics: ["name", "slug", "description", "affiliation", "website", "email", "phone"],
  location: ["address", "city", "postcode", "borough", "country", "latitude", "longitude"],
  media: ["logoUrl", "coverImageUrl", "categories", "facebookUrl", "instagramUrl", "xUrl"],
  settings: ["dropInPrice", "giAvailable", "nogiAvailable", "beginnerFriendly", "competitionFocused", "featured", "verificationStatus"],
  review: [],
};

const fieldStep = Object.fromEntries(
  Object.entries(fieldsByStep).flatMap(([step, fields]) => fields.map((field) => [field, step])),
) as Record<string, StepId>;

function checkboxValue(value?: boolean) {
  return value ? "on" : "off";
}

function nullableValue(value?: string | null) {
  return value ?? "";
}

function academyValues(academy?: Academy): AcademyValues {
  if (!academy) return {};
  return {
    name: academy.name,
    slug: academy.slug,
    description: academy.description,
    affiliation: nullableValue(academy.affiliation),
    website: nullableValue(academy.website),
    email: nullableValue(academy.email),
    phone: nullableValue(academy.phone),
    address: academy.address,
    city: academy.city,
    postcode: academy.postcode,
    borough: nullableValue(academy.borough),
    country: academy.country,
    latitude: academy.latitude.toString(),
    longitude: academy.longitude.toString(),
    logoUrl: nullableValue(academy.logoUrl),
    coverImageUrl: nullableValue(academy.coverImageUrl),
    categories: nullableValue(academy.categories),
    facebookUrl: nullableValue(academy.facebookUrl),
    instagramUrl: nullableValue(academy.instagramUrl),
    xUrl: nullableValue(academy.xUrl),
    dropInPrice: academy.dropInPrice?.toString() ?? "",
    giAvailable: checkboxValue(academy.giAvailable),
    nogiAvailable: checkboxValue(academy.nogiAvailable),
    beginnerFriendly: checkboxValue(academy.beginnerFriendly),
    competitionFocused: checkboxValue(academy.competitionFocused),
    featured: checkboxValue(academy.featured),
    verificationStatus: academy.verificationStatus,
  };
}

export function AcademyForm({ action, academy, cancelHref, returnTo }: { action: AcademyAction; academy?: Academy; cancelHref?: string; returnTo?: string }) {
  return <MultiStepAcademyForm academy={academy} action={action} cancelHref={cancelHref} returnTo={returnTo} />;
}

function MultiStepAcademyForm({ action, academy, cancelHref = "/admin?panel=academies", returnTo }: { action: AcademyAction; academy?: Academy; cancelHref?: string; returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(action, initialAcademyFormState);
  const mode = academy ? "edit" : "create";
  const [values, setValues] = useState<AcademyValues>(() => ({ ...defaultValues, ...academyValues(academy), ...state.values }));
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex].id;

  useEffect(() => {
    if (!state.values || !Object.keys(state.values).length) return;
    const firstErrorField = Object.keys(state.fieldErrors).find((field) => state.fieldErrors[field]?.length);
    const timeout = window.setTimeout(() => {
      setValues((current) => ({ ...current, ...state.values }));
      if (firstErrorField && fieldStep[firstErrorField]) {
        setStepIndex(steps.findIndex((step) => step.id === fieldStep[firstErrorField]));
      }
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [state.fieldErrors, state.values]);

  const clientErrors = useMemo(() => validateValues(values), [values]);
  const completedSteps = useMemo(() => new Set(steps.slice(0, stepIndex).map((step) => step.id)), [stepIndex]);

  function updateField(name: string, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  function autoGenerateSlug() {
    const slug = values.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    updateField("slug", slug);
  }

  function stepHasErrors(step: StepId) {
    return fieldsByStep[step].some((field) => clientErrors[field] || state.fieldErrors[field]?.length);
  }

  function goToStep(nextIndex: number) {
    if (nextIndex > stepIndex && stepHasErrors(currentStep)) return;
    setStepIndex(nextIndex);
  }

  function nextStep() {
    if (stepHasErrors(currentStep)) return;
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (currentStep !== "review") {
      event.preventDefault();
    }
  }

  return (
    <form action={currentStep === "review" ? formAction : undefined} onSubmit={handleSubmit} className="mt-6 overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {Object.entries(values).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}

      <div className="border-b border-stone-100 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase text-teal-800">{mode === "edit" ? "Edit Academy" : "New Academy"}</p>
            <h3 className="mt-1 text-2xl font-black text-stone-950">{mode === "edit" ? "Guided academy update" : "Guided academy setup"}</h3>
          </div>
          <p className="text-sm font-bold text-stone-600">Step {stepIndex + 1} of {steps.length}</p>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(index)}
              className={`min-h-10 rounded-md border px-3 text-sm font-bold ${index === stepIndex ? "border-teal-700 bg-teal-700 text-white" : completedSteps.has(step.id) ? "border-teal-200 bg-teal-50 text-teal-800" : stepHasErrors(step.id) ? "border-red-200 bg-red-50 text-red-700" : "border-stone-200 text-stone-600"}`}
            >
              {step.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[1fr_360px] lg:p-6">
        <section className="min-w-0">
          {state.message ? <p className="mb-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
          {currentStep === "basics" ? <BasicsStep autoGenerateSlug={autoGenerateSlug} errors={mergeErrors(clientErrors, state.fieldErrors)} updateField={updateField} values={values} /> : null}
          {currentStep === "location" ? <LocationStep errors={mergeErrors(clientErrors, state.fieldErrors)} updateField={updateField} values={values} /> : null}
          {currentStep === "media" ? <MediaStep errors={mergeErrors(clientErrors, state.fieldErrors)} updateField={updateField} values={values} /> : null}
          {currentStep === "settings" ? <SettingsStep errors={mergeErrors(clientErrors, state.fieldErrors)} updateField={updateField} values={values} /> : null}
          {currentStep === "review" ? <ReviewStep errors={clientErrors} mode={mode} setStepIndex={setStepIndex} values={values} /> : null}
        </section>

        <aside className="grid gap-4 lg:sticky lg:top-4 lg:self-start">
          <LivePreview values={values} />
          <section className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <h4 className="font-black text-stone-950">Next-step checklist</h4>
            <div className="mt-3 grid gap-2 text-sm">
              {steps.filter((step) => step.id !== "review").map((step) => (
                <p key={step.id} className={stepHasErrors(step.id) ? "font-semibold text-red-700" : "font-semibold text-teal-800"}>
                  {stepHasErrors(step.id) ? "Needs attention" : "Ready"} · {step.label}
                </p>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 bg-white/95 p-4 backdrop-blur">
        <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">Cancel</Link>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={(event) => { event.preventDefault(); setStepIndex((index) => Math.max(index - 1, 0)); }} disabled={stepIndex === 0} className="min-h-11 rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800 disabled:text-stone-400">Back</button>
          {currentStep === "review" ? (
            <button type="submit" disabled={isPending || Object.keys(clientErrors).length > 0} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
              {isPending ? (mode === "edit" ? "Saving..." : "Creating...") : mode === "edit" ? "Save Academy" : "Create Academy"}
            </button>
          ) : (
            <button type="button" onClick={(event) => { event.preventDefault(); nextStep(); }} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white">Next</button>
          )}
        </div>
      </div>
    </form>
  );
}

function BasicsStep({ autoGenerateSlug, errors, updateField, values }: StepProps & { autoGenerateSlug: () => void }) {
  return (
    <StepSection title="Basics" description="Start with the public identity and contact details.">
      <Field name="name" label="Name" required value={values.name} errors={errors.name} onChange={updateField} />
      <div className="grid gap-2">
        <Field name="slug" label="Slug" required value={values.slug} errors={errors.slug} onChange={updateField} />
        <button type="button" onClick={autoGenerateSlug} className="w-fit rounded-md border border-teal-200 px-3 py-2 text-sm font-bold text-teal-800">Auto-generate slug</button>
      </div>
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Description <span className="text-xs font-bold text-red-700">Required</span>
        <textarea value={values.description} onChange={(event) => updateField("description", event.target.value)} className="min-h-32 rounded-md border border-stone-300 px-3 py-2 text-base font-normal" />
        <span className={`text-xs font-semibold ${values.description.length < 10 ? "text-red-700" : "text-stone-500"}`}>{values.description.length} characters · minimum 10</span>
        <FieldError errors={errors.description ? [errors.description] : undefined} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="affiliation" label="Affiliation" value={values.affiliation} errors={errors.affiliation} onChange={updateField} />
        <Field name="website" label="Website" value={values.website} errors={errors.website} onChange={updateField} />
        <Field name="email" label="Email" value={values.email} errors={errors.email} onChange={updateField} />
        <Field name="phone" label="Phone" value={values.phone} errors={errors.phone} onChange={updateField} />
      </div>
    </StepSection>
  );
}

function LocationStep({ errors, updateField, values }: StepProps) {
  return (
    <StepSection title="Location" description="Add the address and coordinates used in public listings.">
      <Field name="address" label="Address" required value={values.address} errors={errors.address} onChange={updateField} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="city" label="City" required value={values.city} errors={errors.city} onChange={updateField} />
        <Field name="postcode" label="Postcode" required value={values.postcode} errors={errors.postcode} onChange={updateField} />
        <Field name="borough" label="Borough" value={values.borough} errors={errors.borough} onChange={updateField} />
        <Field name="country" label="Country" required value={values.country} errors={errors.country} onChange={updateField} />
        <Field name="latitude" label="Latitude" required value={values.latitude} errors={errors.latitude} onChange={updateField} />
        <Field name="longitude" label="Longitude" required value={values.longitude} errors={errors.longitude} onChange={updateField} />
      </div>
    </StepSection>
  );
}

function MediaStep({ errors, updateField, values }: StepProps) {
  return (
    <StepSection title="Media And Social" description="Optional images, category text, and social links.">
      <Field name="logoUrl" label="Logo URL" value={values.logoUrl} errors={errors.logoUrl} onChange={updateField} />
      <Field name="coverImageUrl" label="Cover Image URL" value={values.coverImageUrl} errors={errors.coverImageUrl} onChange={updateField} />
      <Field name="categories" label="Categories" value={values.categories} errors={errors.categories} onChange={updateField} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field name="facebookUrl" label="Facebook URL" value={values.facebookUrl} errors={errors.facebookUrl} onChange={updateField} />
        <Field name="instagramUrl" label="Instagram URL" value={values.instagramUrl} errors={errors.instagramUrl} onChange={updateField} />
        <Field name="xUrl" label="X URL" value={values.xUrl} errors={errors.xUrl} onChange={updateField} />
      </div>
    </StepSection>
  );
}

function SettingsStep({ errors, updateField, values }: StepProps) {
  return (
    <StepSection title="Settings" description="Training availability, commercial information, and verification state.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="dropInPrice" label="Drop-in Price" value={values.dropInPrice} errors={errors.dropInPrice} onChange={updateField} />
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Verification Status
          <select value={values.verificationStatus} onChange={(event) => updateField("verificationStatus", event.target.value)} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={AcademyVerificationStatus.PENDING}>Pending</option>
            <option value={AcademyVerificationStatus.VERIFIED}>Verified</option>
            <option value={AcademyVerificationStatus.REJECTED}>Rejected</option>
          </select>
          <FieldError errors={errors.verificationStatus ? [errors.verificationStatus] : undefined} />
        </label>
      </div>
      <div className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-2">
        <Toggle name="giAvailable" label="Gi available" updateField={updateField} values={values} />
        <Toggle name="nogiAvailable" label="No-Gi available" updateField={updateField} values={values} />
        <Toggle name="beginnerFriendly" label="Beginner friendly" updateField={updateField} values={values} />
        <Toggle name="competitionFocused" label="Competition focused" updateField={updateField} values={values} />
        <Toggle name="featured" label="Featured academy" updateField={updateField} values={values} />
      </div>
      <p className="text-sm font-semibold text-stone-600">Public verified status is derived from the selected verification status.</p>
    </StepSection>
  );
}

function ReviewStep({ errors, mode, setStepIndex, values }: { errors: Record<string, string>; mode: "create" | "edit"; setStepIndex: (index: number) => void; values: AcademyValues }) {
  const errorEntries = Object.entries(errors);
  const actionLabel = mode === "edit" ? "saving" : "creating";
  return (
    <StepSection title="Review" description={`Confirm the academy information before ${actionLabel} the record.`}>
      {errorEntries.length ? (
        <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">
          <p className="font-black">Resolve these items before {actionLabel}:</p>
          <ul className="mt-2 list-disc pl-5">
            {errorEntries.map(([field, error]) => <li key={field}>{field}: {error}</li>)}
          </ul>
        </div>
      ) : null}
      {steps.filter((step) => step.id !== "review").map((step) => (
        <section key={step.id} className="rounded-md border border-stone-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h4 className="font-black text-stone-950">{step.label}</h4>
            <button type="button" onClick={() => setStepIndex(steps.findIndex((item) => item.id === step.id))} className="text-sm font-bold text-teal-800">Edit</button>
          </div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {fieldsByStep[step.id].map((field) => (
              <ReviewValue key={field} label={field} value={displayValue(field, values[field])} />
            ))}
          </div>
        </section>
      ))}
    </StepSection>
  );
}

function LivePreview({ values }: { values: AcademyValues }) {
  const verified = values.verificationStatus === AcademyVerificationStatus.VERIFIED;
  return (
    <section className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm">
      <div className="h-28 bg-stone-100">
        {isLikelyUrl(values.coverImageUrl) ? <Image src={values.coverImageUrl} alt="" width={640} height={180} unoptimized className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm font-bold text-stone-500">Cover preview</div>}
      </div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-50 text-lg font-black text-teal-800 ring-1 ring-teal-100">
            {isLikelyUrl(values.logoUrl) ? <Image src={values.logoUrl} alt="" width={56} height={56} unoptimized className="size-14 rounded-full object-cover" /> : initials(values.name || "Academy")}
          </div>
          <div className="min-w-0">
            <h4 className="break-words text-lg font-black text-stone-950">{values.name || "Academy name"}</h4>
            <p className="mt-1 text-sm text-stone-600">{values.city || "City"}, {values.country || "Country"}</p>
            <p className={`mt-2 inline-flex rounded-md px-2 py-1 text-xs font-bold ${verified ? "bg-teal-50 text-teal-800" : "bg-stone-100 text-stone-600"}`}>{verified ? "Verified" : values.verificationStatus}</p>
          </div>
        </div>
        <p className="mt-4 line-clamp-4 text-sm leading-6 text-stone-700">{values.description || "Public academy summary will appear here as you complete the form."}</p>
      </div>
    </section>
  );
}

type StepProps = {
  errors: Record<string, string | undefined>;
  updateField: (name: string, value: string) => void;
  values: AcademyValues;
};

function StepSection({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  return (
    <section className="grid gap-5">
      <div>
        <h4 className="text-2xl font-black text-stone-950">{title}</h4>
        <p className="mt-1 text-sm text-stone-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Field({ errors, label, name, onChange, required, value }: { errors?: string; label: string; name: string; onChange: (name: string, value: string) => void; required?: boolean; value: string }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      <span>{label} {required ? <span className="text-xs font-bold text-red-700">Required</span> : null}</span>
      <input value={value} onChange={(event) => onChange(name, event.target.value)} aria-invalid={errors ? "true" : undefined} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
      <FieldError errors={errors ? [errors] : undefined} />
    </label>
  );
}

function Toggle({ label, name, updateField, values }: { label: string; name: string; updateField: (name: string, value: string) => void; values: AcademyValues }) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-stone-200 p-3 text-sm font-semibold text-stone-800">
      <input type="checkbox" checked={values[name] === "on"} onChange={(event) => updateField(name, event.target.checked ? "on" : "off")} className="size-4 accent-teal-700" />
      {label}
    </label>
  );
}

function ReviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase text-stone-500">{label}</p>
      <p className="mt-1 break-words font-semibold text-stone-950">{value || "Not provided"}</p>
    </div>
  );
}

function ClassicAcademyForm({ action, academy, cancelHref, returnTo }: { action: AcademyAction; academy?: Academy; cancelHref?: string; returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(action, initialAcademyFormState);

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <ClassicField name="name" label="Name" value={state.values.name ?? academy?.name} errors={state.fieldErrors.name} />
      <ClassicField name="slug" label="Slug" value={state.values.slug ?? academy?.slug} errors={state.fieldErrors.slug} />
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Description
        <textarea name="description" required defaultValue={state.values.description ?? academy?.description} className="min-h-28 rounded-md border border-stone-300 px-3 py-2 text-base font-normal" />
        <FieldError errors={state.fieldErrors.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <ClassicField name="affiliation" label="Affiliation" value={state.values.affiliation ?? academy?.affiliation ?? ""} required={false} errors={state.fieldErrors.affiliation} />
        <ClassicField name="website" label="Website" value={state.values.website ?? academy?.website ?? ""} required={false} errors={state.fieldErrors.website} />
        <ClassicField name="email" label="Email" value={state.values.email ?? academy?.email ?? ""} required={false} errors={state.fieldErrors.email} />
        <ClassicField name="phone" label="Phone" value={state.values.phone ?? academy?.phone ?? ""} required={false} errors={state.fieldErrors.phone} />
        <ClassicField name="address" label="Address" value={state.values.address ?? academy?.address} errors={state.fieldErrors.address} />
        <ClassicField name="city" label="City" value={state.values.city ?? academy?.city ?? "London"} errors={state.fieldErrors.city} />
        <ClassicField name="postcode" label="Postcode" value={state.values.postcode ?? academy?.postcode} errors={state.fieldErrors.postcode} />
        <ClassicField name="borough" label="Borough" value={state.values.borough ?? academy?.borough ?? ""} required={false} errors={state.fieldErrors.borough} />
        <ClassicField name="country" label="Country" value={state.values.country ?? academy?.country ?? "United Kingdom"} errors={state.fieldErrors.country} />
        <ClassicField name="latitude" label="Latitude" value={state.values.latitude ?? academy?.latitude.toString() ?? "51.5072"} errors={state.fieldErrors.latitude} />
        <ClassicField name="longitude" label="Longitude" value={state.values.longitude ?? academy?.longitude.toString() ?? "-0.1276"} errors={state.fieldErrors.longitude} />
        <ClassicField name="dropInPrice" label="Drop-in Price" value={state.values.dropInPrice ?? academy?.dropInPrice?.toString() ?? ""} required={false} errors={state.fieldErrors.dropInPrice} />
        <ClassicField name="logoUrl" label="Logo URL" value={state.values.logoUrl ?? academy?.logoUrl ?? ""} required={false} errors={state.fieldErrors.logoUrl} />
        <ClassicField name="coverImageUrl" label="Cover Image URL" value={state.values.coverImageUrl ?? academy?.coverImageUrl ?? ""} required={false} errors={state.fieldErrors.coverImageUrl} />
        <ClassicField name="categories" label="Categories" value={state.values.categories ?? academy?.categories ?? ""} required={false} errors={state.fieldErrors.categories} />
        <ClassicField name="facebookUrl" label="Facebook URL" value={state.values.facebookUrl ?? academy?.facebookUrl ?? ""} required={false} errors={state.fieldErrors.facebookUrl} />
        <ClassicField name="instagramUrl" label="Instagram URL" value={state.values.instagramUrl ?? academy?.instagramUrl ?? ""} required={false} errors={state.fieldErrors.instagramUrl} />
        <ClassicField name="xUrl" label="X URL" value={state.values.xUrl ?? academy?.xUrl ?? ""} required={false} errors={state.fieldErrors.xUrl} />
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Verification Status
          <select name="verificationStatus" defaultValue={state.values.verificationStatus ?? academy?.verificationStatus ?? AcademyVerificationStatus.PENDING} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={AcademyVerificationStatus.PENDING}>Pending</option>
            <option value={AcademyVerificationStatus.VERIFIED}>Verified</option>
            <option value={AcademyVerificationStatus.REJECTED}>Rejected</option>
          </select>
          <FieldError errors={state.fieldErrors.verificationStatus} />
        </label>
      </div>
      <div className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-2">
        <ClassicCheckbox name="giAvailable" label="Gi available" checked={state.values.giAvailable ? state.values.giAvailable === "on" : academy?.giAvailable ?? true} />
        <ClassicCheckbox name="nogiAvailable" label="No-Gi available" checked={state.values.nogiAvailable ? state.values.nogiAvailable === "on" : academy?.nogiAvailable ?? true} />
        <ClassicCheckbox name="beginnerFriendly" label="Beginner friendly" checked={state.values.beginnerFriendly ? state.values.beginnerFriendly === "on" : academy?.beginnerFriendly ?? true} />
        <ClassicCheckbox name="competitionFocused" label="Competition focused" checked={state.values.competitionFocused ? state.values.competitionFocused === "on" : academy?.competitionFocused ?? false} />
        <ClassicCheckbox name="featured" label="Featured academy" checked={state.values.featured ? state.values.featured === "on" : academy?.featured ?? false} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button disabled={isPending} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
          {isPending ? "Saving..." : "Save Academy"}
        </button>
        {cancelHref ? <Link href={cancelHref} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-bold text-stone-800">Cancel</Link> : null}
      </div>
    </form>
  );
}

function validateValues(values: AcademyValues) {
  const errors: Record<string, string> = {};
  if (values.name.trim().length < 2) errors.name = "Name must be at least 2 characters.";
  if (!/^[a-z0-9-]{2,}$/.test(values.slug.trim())) errors.slug = "Use lowercase letters, numbers, and hyphens.";
  if (values.description.trim().length < 10) errors.description = "Description must be at least 10 characters.";
  if (values.address.trim().length < 4) errors.address = "Address must be at least 4 characters.";
  if (values.city.trim().length < 2) errors.city = "City is required.";
  if (values.postcode.trim().length < 3) errors.postcode = "Postcode is required.";
  if (values.country.trim().length < 2) errors.country = "Country is required.";
  if (!Number.isFinite(Number(values.latitude))) errors.latitude = "Latitude must be a valid number.";
  if (!Number.isFinite(Number(values.longitude))) errors.longitude = "Longitude must be a valid number.";
  ["website", "logoUrl", "coverImageUrl", "facebookUrl", "instagramUrl", "xUrl"].forEach((field) => {
    if (values[field] && !isLikelyUrl(values[field])) errors[field] = "Enter a valid URL or leave blank.";
  });
  if (values.email && !values.email.includes("@")) errors.email = "Enter a valid email or leave blank.";
  if (values.dropInPrice && !Number.isFinite(Number(values.dropInPrice))) errors.dropInPrice = "Drop-in price must be a valid number.";
  if (values.dropInPrice && Number(values.dropInPrice) < 0) errors.dropInPrice = "Drop-in price cannot be negative.";
  return errors;
}

function mergeErrors(clientErrors: Record<string, string>, serverErrors: Record<string, string[] | undefined>) {
  const merged: Record<string, string | undefined> = { ...clientErrors };
  Object.entries(serverErrors).forEach(([field, errors]) => {
    if (errors?.[0]) merged[field] = errors[0];
  });
  return merged;
}

function displayValue(field: string, value: string) {
  if (["giAvailable", "nogiAvailable", "beginnerFriendly", "competitionFocused", "featured"].includes(field)) return value === "on" ? "Yes" : "No";
  if (field === "verificationStatus") return value;
  return value || "Not provided";
}

function isLikelyUrl(value: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function initials(value: string) {
  return value.split(/\s|-/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "A";
}

function ClassicField({ name, label, value, required = true, errors }: { name: string; label: string; value?: string; required?: boolean; errors?: string[] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input name={name} required={required} defaultValue={value} aria-invalid={errors ? "true" : undefined} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
      <FieldError errors={errors} />
    </label>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs font-semibold text-red-700">{errors[0]}</span>;
}

function ClassicCheckbox({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
      <input name={name} type="hidden" value="off" />
      <input name={name} type="checkbox" defaultChecked={checked} className="size-4 accent-teal-700" />
      {label}
    </label>
  );
}
