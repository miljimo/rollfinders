"use client";

import { GiType, type Academy, type Event } from "@prisma/client";
import { useActionState } from "react";
import type { EventFormState } from "./actions";

type EventAction = (state: EventFormState, formData: FormData) => Promise<EventFormState>;

const initialState: EventFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

export function OpenMatForm({ action, academies, event }: { action: EventAction; academies: Academy[]; event?: Event }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const eventDate = event?.eventDate.toISOString().slice(0, 10);

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Academy
        <select name="academyId" required defaultValue={state.values.academyId ?? event?.academyId ?? ""} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
          <option value="">Select academy</option>
          {academies.map((academy) => <option key={academy.id} value={academy.id}>{academy.name}</option>)}
        </select>
        <FieldError errors={state.fieldErrors.academyId} />
      </label>
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
      <button disabled={isPending} className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-stone-400">
        {isPending ? "Saving..." : "Save Open Mat"}
      </button>
    </form>
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
