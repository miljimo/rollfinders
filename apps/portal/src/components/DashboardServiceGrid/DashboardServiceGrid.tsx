import Link from "next/link";
import { clsx } from "clsx";
import { Icon, type SidePanelIcon } from "@/components/Icons";

export type DashboardServiceGridItem = {
  description: string;
  href: string;
  icon: SidePanelIcon;
  label: string;
};

const cardSizeClasses = [
  "md:col-span-3 xl:col-span-3",
  "md:col-span-3 xl:col-span-3",
  "md:col-span-3 xl:col-span-3",
  "md:col-span-3 xl:col-span-3",
  "md:col-span-4 xl:col-span-4",
  "md:col-span-4 xl:col-span-3 xl:row-span-2",
  "md:col-span-2 xl:col-span-2",
  "md:col-span-3 xl:col-span-3",
  "md:col-span-4 xl:col-span-4",
  "md:col-span-3 xl:col-span-3",
  "md:col-span-3 xl:col-span-3",
];

export function DashboardServiceGrid({ items }: { items: DashboardServiceGridItem[] }) {
  return (
    <section className="mt-7 rounded-lg border border-teal-100 bg-white p-4 shadow-sm sm:p-6">
      <div className="grid auto-rows-[8.5rem] grid-cols-1 gap-4 md:grid-cols-6 xl:grid-cols-12">
        {items.map((item, index) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "group flex min-h-32 items-center gap-4 rounded-lg border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2",
              cardSizeClasses[index % cardSizeClasses.length],
            )}
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-800 ring-1 ring-teal-100 transition group-hover:bg-teal-100">
              <Icon name={item.icon} size={25} className="shrink-0" />
            </span>
            <span className="min-w-0">
              <span className="block text-base font-black text-slate-950">{item.label}</span>
              <span className="mt-2 block text-sm font-medium leading-5 text-slate-600">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
