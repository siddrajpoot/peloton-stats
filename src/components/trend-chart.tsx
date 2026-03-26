"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Scatter,
  ComposedChart,
  Line,
} from "recharts";
import { formatDateShort } from "@/lib/utils";

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  label: string;
  unit: string;
  color?: string;
}

export function TrendChart({
  data,
  dataKey,
  label,
  unit,
  color = "hsl(var(--chart-1))",
}: TrendChartProps) {
  // Compute rolling average (7-ride window)
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
          <ChartTooltip content={<ChartTooltipContent />} />
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
