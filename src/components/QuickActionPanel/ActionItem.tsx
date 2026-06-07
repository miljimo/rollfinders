import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { QuickActionPanelItem } from "./types";

export type ActionItemProps = {
  item: QuickActionPanelItem;
};

export function ActionItem({ item }: ActionItemProps) {
  const className = `flex min-h-24 w-full items-center gap-4 rounded-lg border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:w-fit sm:min-w-72 sm:max-w-[34rem] ${item.active ? "border-teal-500 ring-1 ring-teal-500" : "border-stone-200"} ${item.disabled ? "cursor-not-allowed opacity-60" : "hover:border-teal-500"}`;
  const ariaLabel = item.ariaLabel ?? `${item.title}: ${item.description}`;
  const content = (
    <>
      <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">{item.icon}</span>
      <span className="min-w-0 flex-1 sm:w-max sm:max-w-[24rem]">
        <span className="block break-words font-black text-slate-950">{item.title}</span>
        <span className="mt-1 block break-words text-sm font-semibold text-slate-500">{item.description}</span>
      </span>
      <ChevronRight size={20} aria-hidden className="shrink-0" />
    </>
  );

  if (item.disabled) {
    return (
      <span className={className} aria-disabled="true" aria-label={ariaLabel} role="link">
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className} aria-current={item.active ? "page" : undefined} aria-label={ariaLabel}>
      {content}
    </Link>
  );
}
