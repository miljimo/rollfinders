export type LineOverviewChartPoint = {
  label: string;
  value: number;
};

export type LineOverviewChartProps = {
  className?: string;
  currency?: string;
  formatValue?: (value: number) => string;
  id?: string;
  maxTicks?: number;
  maxValue?: number;
  points: LineOverviewChartPoint[];
  title?: string;
};
