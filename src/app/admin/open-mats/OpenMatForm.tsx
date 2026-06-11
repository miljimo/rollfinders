"use client";

import { EventAudience, GiType, RecurrenceType, type Academy, type Event } from "@prisma/client";
import { type ClipboardEvent, useActionState, useState } from "react";
import { Button } from "@/components/Button";
import { AutoCompleteTextField, type AutoCompleteTextFieldOption } from "@/components/AutoCompleteTextField";
import type { EventFormState } from "./actions";

type EventAction = (state: EventFormState, formData: FormData) => Promise<EventFormState>;
export type OpenMatFormEvent = Omit<Event, "price"> & { price: string };

const initialState: EventFormState = {
  message: "",
  fieldErrors: {},
  values: {},
};

export function OpenMatForm({ action, academies, cancelHref, event, returnTo }: { action: EventAction; academies: Academy[]; cancelHref?: string; event?: OpenMatFormEvent; returnTo?: string }) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const eventDate = event?.eventDate.toISOString().slice(0, 10);
  const recurrenceEndDate = event?.recurrenceEndDate?.toISOString().slice(0, 10);
  const recurrenceInterval = state.values.recurrenceInterval ?? event?.recurrenceInterval?.toString() ?? "1";
  const selectedAcademyId = state.values.academyId ?? event?.academyId ?? "";
  const initialPrice = state.values.price ?? event?.price ?? "0";
  const [price, setPrice] = useState(initialPrice);
  const showAudience = Number(price) > 0;

  return (
    <form action={formAction} className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
      {state.message ? <p className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-800">{state.message}</p> : null}
      <AcademySearchSelect academies={academies} errors={state.fieldErrors.academyId} selectedAcademyId={selectedAcademyId} />
      <Field name="title" label="Title" value={state.values.title ?? event?.title} errors={state.fieldErrors.title} />
      <label className="grid gap-1 text-sm font-semibold text-stone-800">
        Description
        <textarea name="description" required defaultValue={state.values.description ?? event?.description} onPaste={pastePlainText} className="min-h-48 rounded-md border border-stone-300 px-3 py-2 text-base font-normal md:min-h-64" />
        <FieldError errors={state.fieldErrors.description} />
        <span className="text-xs font-medium text-stone-600">Links are pasted as plain text. Use http, https, mailto, or tel links only.</span>
      </label>
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <Field name="eventDate" label="Date" type="date" value={state.values.eventDate ?? eventDate} errors={state.fieldErrors.eventDate} />
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Gi Type
          <select name="giType" required defaultValue={state.values.giType ?? event?.giType ?? GiType.BOTH} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={GiType.BOTH}>Both</option>
            <option value={GiType.GI}>Gi</option>
            <option value={GiType.NO_GI}>No-Gi</option>
          </select>
          <FieldError errors={state.fieldErrors.giType} />
        </label>
        <Field name="startTime" label="Start Time" type="time" value={state.values.startTime ?? event?.startTime ?? "18:30"} errors={state.fieldErrors.startTime} />
        <Field name="endTime" label="End Time" type="time" value={state.values.endTime ?? event?.endTime ?? "20:00"} errors={state.fieldErrors.endTime} />
        <Field name="price" label="Drop-in Cost" type="number" value={initialPrice} onChange={(value) => setPrice(value)} errors={state.fieldErrors.price} />
        <Field name="capacity" label="Capacity" type="number" value={state.values.capacity ?? event?.capacity?.toString() ?? ""} required={false} errors={state.fieldErrors.capacity} />
      </div>
      {showAudience ? (
        <label className="grid gap-1 text-sm font-semibold text-stone-800">
          Drop-in Audience
          <select name="audience" required defaultValue={state.values.audience ?? event?.audience ?? EventAudience.EXTERNAL_ONLY} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
            <option value={EventAudience.EXTERNAL_ONLY}>External visitors only</option>
            <option value={EventAudience.EXTERNAL_AND_MEMBERS}>External visitors and academy members</option>
          </select>
          <span className="text-xs font-medium text-stone-600">Choose whether academy members also pay this drop-in fee.</span>
          <FieldError errors={state.fieldErrors.audience} />
        </label>
      ) : (
        <input type="hidden" name="audience" value={EventAudience.EXTERNAL_ONLY} />
      )}
      <label className="flex items-center gap-2 text-sm font-semibold text-stone-800">
        <input name="active" type="hidden" value="off" />
        <input name="active" type="checkbox" defaultChecked={state.values.active ? state.values.active === "on" : event?.active ?? true} className="size-4 accent-teal-700" />
        Active listing
      </label>
      <fieldset className="grid gap-3 rounded-md border border-stone-200 p-3">
        <legend className="px-1 text-sm font-bold text-stone-900">Recurrence</legend>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(8rem,12rem)]">
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Repeats
            <select name="recurrenceType" defaultValue={state.values.recurrenceType ?? event?.recurrenceType ?? RecurrenceType.NONE} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal">
              <option value={RecurrenceType.NONE}>Does not repeat</option>
              <option value={RecurrenceType.WEEKLY}>Weekly</option>
              <option value={RecurrenceType.MONTHLY}>Monthly</option>
            </select>
            <FieldError errors={state.fieldErrors.recurrenceType} />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-stone-800">
            Repeat Every
            <input name="recurrenceInterval" type="number" min="1" max="52" step="1" defaultValue={recurrenceInterval} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
            <FieldError errors={state.fieldErrors.recurrenceInterval} />
          </label>
        </div>
        <span className="text-xs font-medium text-stone-600">Recurring open mats use one source listing. Use 1 for every week/month, 2 for fortnightly or every 2 months, 3 for every 3 weeks/months.</span>
        <input type="hidden" name="recurrenceLimit" value="" />
        <Field name="recurrenceEndDate" label="Repeat Until" type="date" value={state.values.recurrenceEndDate ?? recurrenceEndDate ?? ""} required={false} errors={state.fieldErrors.recurrenceEndDate} />
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

function Field({ name, label, value, required = true, type = "text", errors, onChange }: { name: string; label: string; value?: string; required?: boolean; type?: string; errors?: string[]; onChange?: (value: string) => void }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input name={name} type={type} required={required} defaultValue={value} onChange={(event) => onChange?.(event.currentTarget.value)} aria-invalid={errors ? "true" : undefined} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal aria-invalid:border-red-500" />
      <FieldError errors={errors} />
    </label>
  );
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <span className="text-xs font-semibold text-red-700">{errors[0]}</span>;
}

function pastePlainText(event: ClipboardEvent<HTMLTextAreaElement>) {
  const text = event.clipboardData.getData("text/plain");
  if (!text) return;

  event.preventDefault();
  const textarea = event.currentTarget;
  textarea.setRangeText(text, textarea.selectionStart, textarea.selectionEnd, "end");
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
}
