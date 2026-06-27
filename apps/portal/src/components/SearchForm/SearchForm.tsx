import { Button } from "@/components/Button";
import { clsx } from "clsx";

export type SearchFormProps = {
  action: string;
  query?: string;
  placeholder: string;
  className?: string;
  hiddenFields?: Record<string, string | number | boolean | null | undefined>;
  inputName?: string;
  submitLabel?: string;
};

export function SearchForm({ action, className, hiddenFields, inputName = "q", query, placeholder, submitLabel = "Search" }: SearchFormProps) {
  const visibleHiddenFields = Object.entries(hiddenFields ?? {}).filter(([, value]) => Boolean(value));

  return (
    <form action={action} className={clsx("flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:flex-row", className)}>
      {visibleHiddenFields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={String(value)} />
      ))}
      <input
        aria-label={placeholder}
        name={inputName}
        defaultValue={query}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-200 px-4 text-base text-stone-950 placeholder:text-stone-500"
      />
      <Button type="submit" variant="primary" className="min-h-12 px-5 font-semibold">
        {submitLabel}
      </Button>
    </form>
  );
}
