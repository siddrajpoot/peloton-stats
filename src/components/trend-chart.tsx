"use client";

import {
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ComposedChart,
  Line,
} from "recharts";
import { formatDate, formatDateShort } from "@/lib/utils";

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  label: string;
  unit: string;
  color?: string;
}

function CustomTooltip({
  active,
  payload,
  dataKey,
  label,
  unit,
  color,
}: {
  active?: boolean;
  payload?: Array<{ payload: Record<string, unknown> }>;
  dataKey: string;
  label: string;
  unit: string;
  color: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const value = point[dataKey] as number | null;
  const avg = point.rollingAvg as number | null;
  const date = point.date as string;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium mb-1">{formatDate(date)}</p>
      {value != null && (
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: "white" }} />
          <span className="text-muted-foreground">{label}:</span>
          <span className="font-medium">{Math.round(value)} {unit}</span>
        </div>
      )}
      {avg != null && (
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-muted-foreground">7-ride avg:</span>
          <span className="font-medium">{Math.round(avg * 10) / 10} {unit}</span>
        </div>
      )}
    </div>
  );
}

export function TrendChart({
  data,
  dataKey,
  label,
  unit,
  color = "#E0736E",
}: TrendChartProps) {
  const withRollingAvg = data.map((point, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1);
    const validValues = window
      .map((w) => w[dataKey] as number | null)
      .filter((v): v is number => v != null);
    const avg =
      validValues.length > 0
        ? validValues.reduce((s, v) => s + v, 0) / validValues.length
        : null;
    return { ...point, rollingAvg: avg };
  });

  const chartConfig = {
    [dataKey]: { label, color },
    rollingAvg: { label: `${label} (7-ride avg)`, color },
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{label} ({unit})</h3>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <ComposedChart data={withRollingAvg}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) => formatDateShort(v)}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip
            content={
              <CustomTooltip
                dataKey={dataKey}
                label={label}
                unit={unit}
                color={color}
              />
            }
          />
          <Scatter
            dataKey={dataKey}
            fill="white"
            opacity={0.4}
            r={2}
          />
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
