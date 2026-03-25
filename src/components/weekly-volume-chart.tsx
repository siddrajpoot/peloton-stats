"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { AggregatedPoint } from "@/lib/types";

interface WeeklyVolumeChartProps {
  data: AggregatedPoint[];
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const chartConfig = {
    ride_count: {
      label: "Rides",
      color: "hsl(var(--chart-1))",
    },
    total_output: {
      label: "Total Output (kJ)",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">Weekly Volume</h3>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            yAxisId="left"
            dataKey="ride_count"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="total_output"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
