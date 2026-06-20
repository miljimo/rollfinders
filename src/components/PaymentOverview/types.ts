import type { LineOverviewChartPoint } from "@/components/LineOverviewChart";

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
  title?: string;
};
