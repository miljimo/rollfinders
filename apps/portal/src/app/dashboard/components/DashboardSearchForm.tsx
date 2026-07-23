import { Search } from "lucide-react";
import { Button } from "@/app/_components/Button";

export function DashboardSearchForm({
  action,
  ariaLabel = "Search",
  children,
  name = "search",
  placeholder = "Search",
  value,
}: {
  action: string;
  ariaLabel?: string;
  children?: React.ReactNode;
  name?: string;
  placeholder?: string;
  value: string;
}) {
  return (
    <form action={action} className="flex min-w-0 gap-2">
      {children}
      <input
        name={name}
        defaultValue={value}
        placeholder={placeholder}
        className="min-h-12 min-w-0 flex-1 rounded-md border border-stone-300 px-4 text-sm"
      />
      <Button type="submit" size="icon" variant="primary" className="min-h-12 w-14" aria-label={ariaLabel}>
        <Search size={20} aria-hidden />
      </Button>
    </form>
  );
}

