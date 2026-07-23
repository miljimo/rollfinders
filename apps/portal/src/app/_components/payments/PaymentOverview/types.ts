import type { LineOverviewChartPoint } from "@/app/_components/LineOverviewChart";
import type { PaymentPeriodOption } from "./PaymentPeriodSelect";

export type PaymentOverviewMetric = {
  colorClassName?: string;
  id: string;
  label: string;
  value: string;
};

export type PaymentOverviewProps = {
  chartPoints: LineOverviewChartPoint[];
  className?: string;
  currency?: string;
  metrics: PaymentOverviewMetric[];
  periodLabel?: string;
  periodOptions?: PaymentPeriodOption[];
  periodValue?: string;
  title?: string;
};
