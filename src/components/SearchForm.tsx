import { Button } from "./Button";

export function SearchForm({ action, query, placeholder }: { action: string; query?: string; placeholder: string }) {
  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:flex-row">
      <input
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        className="min-h-12 flex-1 rounded-md border border-stone-200 px-4 text-base text-stone-950 placeholder:text-stone-500"
      />
      <Button type="submit" variant="primary" className="min-h-12 px-5 font-semibold">
        Search
      </Button>
    </form>
  );
}
