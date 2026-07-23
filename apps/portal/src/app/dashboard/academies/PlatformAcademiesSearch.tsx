import { Search } from "lucide-react";
import { Button } from "@/app/_components/Button";
import { platformAdminAcademiesHref } from "./platformAcademiesUtils";

type AdminSearchParams = Record<string, string | string[] | undefined>;

export function PlatformAcademiesSearch({ params, search }: { params: AdminSearchParams; search: string }) {
  return (
    <form action="/dashboard/academy-review" className="mt-5 flex flex-col gap-2 sm:max-w-xl sm:flex-row">
      <input
        name="platformAcademiesSearch"
        defaultValue={search}
        placeholder="Search academy, location, postcode, or Platform Admin"
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm font-semibold text-slate-900 placeholder:text-slate-400"
      />
      <Button type="submit" variant="primary" className="min-h-12 sm:w-auto">
        <Search size={18} aria-hidden />
        Search
      </Button>
      {search ? (
        <Button href={platformAdminAcademiesHref(params, { platformAcademiesSearch: undefined, platformAcademiesPage: 1 })} variant="secondary" className="min-h-12 border-stone-200 text-slate-700">
          Reset
        </Button>
      ) : null}
    </form>
  );
}

