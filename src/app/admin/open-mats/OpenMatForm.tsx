"use client";

import { GiType, type Academy, type Event } from "@prisma/client";
import { useActionState, useMemo, useState } from "react";
import { Button } from "@/components/Button";
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
      <label className="flex items-start gap-2 text-sm font-semibold text-stone-800">
        <input name="recurring" type="hidden" value="off" />
        <input name="recurring" type="checkbox" defaultChecked={state.values.recurring === "on"} className="mt-0.5 size-4 accent-teal-700" />
        <span>
          Repeat weekly on this day
          <span className="block text-xs font-medium text-stone-600">Creates matching open mats on the same weekday for the next 12 weeks.</span>
        </span>
      </label>
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
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(selectedAcademyId);
  const selectedAcademy = academies.find((academy) => academy.id === selectedId);
  const trimmedQuery = query.trim().toLowerCase();
  const matches = useMemo(() => {
    const filtered = trimmedQuery
      ? academies.filter((academy) => `${academy.name} ${academy.city} ${academy.postcode}`.toLowerCase().includes(trimmedQuery))
      : academies;

    return filtered.slice(0, 25);
  }, [academies, trimmedQuery]);

  return (
    <div className="grid gap-1 text-sm font-semibold text-stone-800">
      <label htmlFor="academy-search">Academy</label>
      <input name="academyId" type="hidden" value={selectedId} />
      <input
        id="academy-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={selectedAcademy ? selectedAcademy.name : "Search academy by name, city, or postcode"}
        aria-invalid={errors ? "true" : undefined}
        className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500"
      />
      {selectedAcademy ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-sm text-teal-950">
          <span>
            Selected: <strong>{selectedAcademy.name}</strong>
          </span>
          <button type="button" className="text-xs font-black text-teal-800 underline" onClick={() => setSelectedId("")}>
            Change
          </button>
        </div>
      ) : null}
      <div className="max-h-48 overflow-auto rounded-md border border-stone-200 bg-white shadow-sm">
        {matches.map((academy) => (
          <button
            key={academy.id}
            type="button"
            className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-semibold hover:bg-teal-50 ${academy.id === selectedId ? "bg-teal-700 text-white hover:bg-teal-700" : "text-stone-800"}`}
            onClick={() => {
              setSelectedId(academy.id);
              setQuery("");
            }}
          >
            <span>{academy.name}</span>
            <span className={academy.id === selectedId ? "text-white/80" : "text-stone-500"}>{academy.city}, {academy.postcode}</span>
          </button>
        ))}
        {!matches.length ? <p className="px-3 py-2 text-sm font-medium text-stone-600">No academies found.</p> : null}
      </div>
      <FieldError errors={errors} />
    </div>
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
