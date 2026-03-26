"use client";

import {
  ChartContainer,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
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
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as AggregatedPoint;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <p className="font-medium mb-1">Week of {formatDateShort(point.date)}</p>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: "#E0736E" }} />
                    <span className="text-muted-foreground">Rides:</span>
                    <span className="font-medium">{point.ride_count}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full opacity-40" style={{ backgroundColor: "#E0736E" }} />
                    <span className="text-muted-foreground">Output:</span>
                    <span className="font-medium">{point.total_output} kJ</span>
                  </div>
                </div>
              );
            }}
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
