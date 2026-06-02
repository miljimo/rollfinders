import type { Academy } from "@prisma/client";

export function AcademyForm({ action, academy }: { action: string; academy?: Academy }) {
  return (
    <form action={action} method="post" className="mt-6 grid gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm">
      <Field name="name" label="Name" value={academy?.name} />
      <Field name="slug" label="Slug" value={academy?.slug} />
      <label className="grid gap-1 text-sm font-semibold text-stone-800">Description<textarea name="description" required defaultValue={academy?.description} className="min-h-28 rounded-md border border-stone-300 px-3 py-2 text-base font-normal" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="affiliation" label="Affiliation" value={academy?.affiliation ?? ""} required={false} />
        <Field name="website" label="Website" value={academy?.website ?? ""} required={false} />
        <Field name="email" label="Email" value={academy?.email ?? ""} required={false} />
        <Field name="phone" label="Phone" value={academy?.phone ?? ""} required={false} />
        <Field name="address" label="Address" value={academy?.address} />
        <Field name="city" label="City" value={academy?.city ?? "London"} />
        <Field name="postcode" label="Postcode" value={academy?.postcode} />
        <Field name="country" label="Country" value={academy?.country ?? "United Kingdom"} />
        <Field name="latitude" label="Latitude" value={academy?.latitude.toString() ?? "51.5072"} />
        <Field name="longitude" label="Longitude" value={academy?.longitude.toString() ?? "-0.1276"} />
        <Field name="logoUrl" label="Logo URL" value={academy?.logoUrl ?? ""} required={false} />
      </div>
      <button className="min-h-11 rounded-md bg-teal-700 px-4 text-sm font-bold text-white">Save Academy</button>
    </form>
  );
}

function Field({ name, label, value, required = true }: { name: string; label: string; value?: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-sm font-semibold text-stone-800">
      {label}
      <input name={name} required={required} defaultValue={value} className="min-h-11 rounded-md border border-stone-300 px-3 text-base font-normal" />
    </label>
  );
}
