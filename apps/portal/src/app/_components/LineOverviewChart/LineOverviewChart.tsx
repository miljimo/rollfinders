import { clsx } from "clsx";
import type { LineOverviewChartProps } from "./types";

function defaultFormatValue(value: number) {
  return value.toLocaleString();
}

function niceCeil(value: number) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function chartPath(points: { x: number; y: number }[]) {
  if (!points.length) return "";
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

export function LineOverviewChart({
  className,
  formatValue = defaultFormatValue,
  id = "line-overview-chart",
  maxTicks = 5,
  maxValue: maxValueOverride,
  points,
  title,
}: LineOverviewChartProps) {
  const chartWidth = 720;
  const chartHeight = 210;
  const padding = { top: 14, right: 20, bottom: 42, left: 62 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const dataMaxValue = Math.max(...points.map((point) => point.value), 0);
  const maxValue = maxValueOverride ? Math.max(maxValueOverride, niceCeil(dataMaxValue)) : niceCeil(dataMaxValue);
  const tickCount = Math.max(2, maxTicks);
  const ticks = Array.from({ length: tickCount }, (_, index) => maxValue - (maxValue / (tickCount - 1)) * index);
  const coordinates = points.map((point, index) => {
    const x = padding.left + (points.length > 1 ? (plotWidth / (points.length - 1)) * index : plotWidth / 2);
    const y = padding.top + plotHeight - (point.value / maxValue) * plotHeight;
    return { ...point, x, y };
  });
  const path = chartPath(coordinates);

  return (
    <div className={clsx("w-full", className)}>
      {title ? <h3 id={`${id}-title`} className="sr-only">{title}</h3> : null}
      <svg
        aria-labelledby={title ? `${id}-title` : undefined}
        className="h-auto w-full overflow-visible"
        role="img"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
      >
        {ticks.map((tick, index) => {
          const y = padding.top + (plotHeight / (tickCount - 1)) * index;
          return (
            <g key={`${tick}-${index}`}>
              <line x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} className="stroke-slate-200" strokeWidth="1" />
              <text x={padding.left - 12} y={y + 4} textAnchor="end" className="fill-slate-600 text-[12px] font-bold">
                {formatValue(tick)}
              </text>
            </g>
          );
        })}
        {path ? <path d={path} fill="none" className="stroke-teal-700" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" /> : null}
        {coordinates.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4.5" className="fill-teal-700 stroke-white" strokeWidth="2" />
            <text x={point.x} y={chartHeight - 14} textAnchor="middle" className="fill-slate-600 text-[12px] font-bold">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
