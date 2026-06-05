export function SearchForm({ action, query, placeholder }: { action: string; query?: string; placeholder: string }) {
  return (
    <form action={action} className="flex flex-col gap-2 rounded-lg border border-stone-200 bg-white p-2 shadow-sm sm:flex-row">
      <input
        name="q"
        defaultValue={query}
        placeholder={placeholder}
        className="min-h-12 flex-1 rounded-md border border-stone-200 px-4 text-base text-stone-950 placeholder:text-stone-500"
      />
      <button className="min-h-12 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800">
        Search
      </button>
    </form>
  );
}
