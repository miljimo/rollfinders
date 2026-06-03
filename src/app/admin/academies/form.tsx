"use client";

import type { Academy } from "@prisma/client";
import { useActionState } from "react";
import type { AcademyFormState } from "./actions";

type AcademyAction = (state: AcademyFormState, formData: FormData) => Promise<AcademyFormState>;

const initialAcademyFormState: AcademyFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

export function AcademyForm({ action, academy }: { action: AcademyAction; academy?: Academy }) {
  const [state, formAction, isPending] = useActionState(action, initialAcademyFormState);

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <Field name="name" label="Name" value={state.values.name ?? academy?.name} errors={state.fieldErrors.name} />
      <Field name="slug" label="Slug" value={state.values.slug ?? academy?.slug} errors={state.fieldErrors.slug} />
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Description
        <textarea name="description" required defaultValue={state.values.description ?? academy?.description} className="min-h-28 rounded-md border border-stone-300 px-3 py-2 text-base font-normal" />
        <FieldError errors={state.fieldErrors.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="affiliation" label="Affiliation" value={state.values.affiliation ?? academy?.affiliation ?? ""} required={false} errors={state.fieldErrors.affiliation} />
        <Field name="website" label="Website" value={state.values.website ?? academy?.website ?? ""} required={false} errors={state.fieldErrors.website} />
        <Field name="email" label="Email" value={state.values.email ?? academy?.email ?? ""} required={false} errors={state.fieldErrors.email} />
        <Field name="phone" label="Phone" value={state.values.phone ?? academy?.phone ?? ""} required={false} errors={state.fieldErrors.phone} />
        <Field name="address" label="Address" value={state.values.address ?? academy?.address} errors={state.fieldErrors.address} />
        <Field name="city" label="City" value={state.values.city ?? academy?.city ?? "London"} errors={state.fieldErrors.city} />
        <Field name="postcode" label="Postcode" value={state.values.postcode ?? academy?.postcode} errors={state.fieldErrors.postcode} />
        <Field name="borough" label="Borough" value={state.values.borough ?? academy?.borough ?? ""} required={false} errors={state.fieldErrors.borough} />
        <Field name="country" label="Country" value={state.values.country ?? academy?.country ?? "United Kingdom"} errors={state.fieldErrors.country} />
        <Field name="latitude" label="Latitude" value={state.values.latitude ?? academy?.latitude.toString() ?? "51.5072"} errors={state.fieldErrors.latitude} />
        <Field name="longitude" label="Longitude" value={state.values.longitude ?? academy?.longitude.toString() ?? "-0.1276"} errors={state.fieldErrors.longitude} />
        <Field name="dropInPrice" label="Drop-in Price" value={state.values.dropInPrice ?? academy?.dropInPrice?.toString() ?? ""} required={false} errors={state.fieldErrors.dropInPrice} />
        <Field name="logoUrl" label="Logo URL" value={state.values.logoUrl ?? academy?.logoUrl ?? ""} required={false} errors={state.fieldErrors.logoUrl} />
      </div>
      <div className="grid gap-3 rounded-md border border-stone-200 p-3 sm:grid-cols-2">
        <Checkbox name="giAvailable" label="Gi available" checked={state.values.giAvailable ? state.values.giAvailable === "on" : academy?.giAvailable ?? true} />
        <Checkbox name="nogiAvailable" label="No-Gi available" checked={state.values.nogiAvailable ? state.values.nogiAvailable === "on" : academy?.nogiAvailable ?? true} />
        <Checkbox name="beginnerFriendly" label="Beginner friendly" checked={state.values.beginnerFriendly ? state.values.beginnerFriendly === "on" : academy?.beginnerFriendly ?? true} />
        <Checkbox name="competitionFocused" label="Competition focused" checked={state.values.competitionFocused ? state.values.competitionFocused === "on" : academy?.competitionFocused ?? false} />
        <Checkbox name="verified" label="Verified listing" checked={state.values.verified ? state.values.verified === "on" : academy?.verified ?? false} />
      </div>
      <button disabled={isPending} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
        {isPending ? "Saving..." : "Save Academy"}
      </button>
    </form>
  );
}

function Field({ name, label, value, required = true, errors }: { name: string; label: string; value?: string; required?: boolean; errors?: string[] }) {
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

function Checkbox({ name, label, checked }: { name: string; label: string; checked: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
      <input name={name} type="hidden" value="off" />
      <input name={name} type="checkbox" defaultChecked={checked} className="size-4 accent-teal-700" />
      {label}
    </label>
  );
}
