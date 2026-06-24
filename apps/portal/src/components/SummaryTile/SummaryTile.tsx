import type { ReactNode } from "react";
import { PanelContext } from "@/components/PanelContext";

export type SummaryTileProps = {
  className?: string;
  detail?: string;
  icon: ReactNode;
  label: string;
  pin?: ReactNode;
  value: string;
};

export function SummaryTile({ className, icon, label, value, detail, pin }: SummaryTileProps) {
  return (
    <PanelContext className={className} pin={pin}>
      <dt className="flex items-center gap-2 text-base font-normal uppercase leading-5 text-stone-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 text-base font-normal leading-5 text-stone-950">{value}</dd>
      {detail ? <dd className="mt-1 text-base font-normal leading-5 text-stone-600">{detail}</dd> : null}
    </PanelContext>
  );
}
