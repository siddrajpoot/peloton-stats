"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { formatDateShort } from "@/lib/utils";
import type { AggregatedPoint } from "@/lib/types";

interface WeeklyVolumeChartProps {
  data: AggregatedPoint[];
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const chartConfig = {
    ride_count: {
      label: "Rides",
      color: "#E0736E",
    },
    total_output: {
      label: "Total Output (kJ)",
      color: "#E0736E",
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
            tickFormatter={(v: string) => formatDateShort(v)}
          />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(value: string) => formatDateShort(value)}
              />
            }
          />
          <Bar
            yAxisId="left"
            dataKey="ride_count"
            fill="#E0736E"
            opacity={0.8}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="total_output"
            fill="#E0736E"
            opacity={0.3}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
