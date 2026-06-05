"use client";

import { GiType, RecurrenceType, type Academy, type Event } from "@prisma/client";
import { useActionState } from "react";
import { Button } from "@/components/Button";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import type { EventFormState } from "./actions";

type EventAction = (state: EventFormState, formData: FormData) => Promise<EventFormState>;

const initialState: EventFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

export function OpenMatForm({ action, academies, cancelHref, event, returnTo }: { action: EventAction; academies: Academy[]; cancelHref?: string; event?: Event; returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const eventDate = event?.eventDate.toISOString().slice(0, 10);
  const recurrenceEndDate = event?.recurrenceEndDate?.toISOString().slice(0, 10);
  const selectedAcademyId = state.values.academyId ?? event?.academyId ?? "";

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <AcademySearchSelect academies={academies} errors={state.fieldErrors.academyId} selectedAcademyId={selectedAcademyId} />
      <Field name="title" label="Title" value={state.values.title ?? event?.title} errors={state.fieldErrors.title} />
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Description
        <textarea name="description" required defaultValue={state.values.description ?? event?.description} className="min-h-28 rounded-md border border-stone-300 px-3 py-2 text-base font-normal" />
        <FieldError errors={state.fieldErrors.description} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="eventDate" label="Date" type="date" value={state.values.eventDate ?? eventDate} errors={state.fieldErrors.eventDate} />
        <Field name="startTime" label="Start Time" type="time" value={state.values.startTime ?? event?.startTime ?? "18:30"} errors={state.fieldErrors.startTime} />
        <Field name="endTime" label="End Time" type="time" value={state.values.endTime ?? event?.endTime ?? "20:00"} errors={state.fieldErrors.endTime} />
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Gi Type
          <select name="giType" required defaultValue={state.values.giType ?? event?.giType ?? GiType.BOTH} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={GiType.BOTH}>Both</option>
            <option value={GiType.GI}>Gi</option>
            <option value={GiType.NO_GI}>No-Gi</option>
          </select>
          <FieldError errors={state.fieldErrors.giType} />
        </label>
        <Field name="price" label="Drop-in Cost" type="number" value={state.values.price ?? event?.price.toString() ?? "0"} errors={state.fieldErrors.price} />
        <Field name="capacity" label="Capacity" type="number" value={state.values.capacity ?? event?.capacity?.toString() ?? ""} required={false} errors={state.fieldErrors.capacity} />
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input name="active" type="hidden" value="off" />
        <input name="active" type="checkbox" defaultChecked={state.values.active ? state.values.active === "on" : event?.active ?? true} className="size-4 accent-teal-700" />
        Active listing
      </label>
      <fieldset className="grid gap-3 rounded-md border border-stone-200 p-3">
        <legend className="px-1 text-sm font-bold text-stone-900">Recurrence</legend>
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Repeats
          <select name="recurrenceType" defaultValue={state.values.recurrenceType ?? event?.recurrenceType ?? RecurrenceType.NONE} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={RecurrenceType.NONE}>Does not repeat</option>
            <option value={RecurrenceType.WEEKLY}>Weekly</option>
            <option value={RecurrenceType.MONTHLY}>Monthly</option>
            <option value={RecurrenceType.YEARLY}>Yearly</option>
          </select>
          <FieldError errors={state.fieldErrors.recurrenceType} />
          <span className="text-xs font-medium text-stone-600">Recurring open mats use one source listing. Future dates are derived automatically and update when this listing changes.</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="recurrenceEndDate" label="Repeat Until" type="date" value={state.values.recurrenceEndDate ?? recurrenceEndDate ?? ""} required={false} errors={state.fieldErrors.recurrenceEndDate} />
          <Field name="recurrenceLimit" label="Occurrence Limit" type="number" value={state.values.recurrenceLimit ?? event?.recurrenceLimit?.toString() ?? ""} required={false} errors={state.fieldErrors.recurrenceLimit} />
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isPending} variant="primary">
          {isPending ? "Saving..." : "Save Open Mat"}
        </Button>
        {cancelHref ? <Button href={cancelHref} variant="secondary">Cancel</Button> : null}
      </div>
    </form>
  );
}

function AcademySearchSelect({ academies, errors, selectedAcademyId }: { academies: Academy[]; errors?: string[]; selectedAcademyId: string }) {
  const options: AutoCompleteTextFieldOption[] = academies.map((academy) => ({
    id: academy.id,
    label: academy.name,
    description: `${academy.city}, ${academy.postcode}`,
    meta: `${academy.city} ${academy.postcode}`,
  }));

  return (
    <AutoCompleteTextField
      label="Academy"
      name="academyId"
      options={options}
      selectedId={selectedAcademyId}
      placeholder="Search academy by name, city, or postcode"
      emptyMessage="No academies found."
      errors={errors}
    />
  );
}

function Field({ name, label, value, required = true, type = "text", errors }: { name: string; label: string; value?: string; required?: boolean; type?: string; errors?: string[] }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input name={name} type={type} required={required} defaultValue={value} aria-invalid={errors ? "true" : undefined} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
      <FieldError errors={errors} />
    </label>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs font-semibold text-red-700">{errors[0]}</span>;
}
