"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendChart } from "@/components/trend-chart";
import { WeeklyVolumeChart } from "@/components/weekly-volume-chart";
import type { Ride, Granularity, AggregatedPoint } from "@/lib/types";

interface TrendChartsSectionProps {
  refreshKey: number;
}

export function TrendChartsSection({ refreshKey }: TrendChartsSectionProps) {
  const [granularity, setGranularity] = useState<Granularity>("raw");
  const [rawRides, setRawRides] = useState<Ride[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<AggregatedPoint[]>([]);

  useEffect(() => {
    async function load() {
      // Always fetch weekly data for the volume chart
      const weeklyRes = await fetch("/api/rides?view=weekly");
      setWeeklyData(await weeklyRes.json());

      if (granularity === "raw") {
        const res = await fetch("/api/rides?order=asc");
        setRawRides(await res.json());
      } else {
        const res = await fetch(`/api/rides?view=${granularity}`);
        setAggregatedData(await res.json());
      }
    }
    load();
  }, [granularity, refreshKey]);

  const chartData =
    granularity === "raw"
      ? rawRides.map((r) => ({
          date: r.started_at,
          output: r.total_output,
          cadence: r.avg_cadence,
          resistance: r.avg_resistance,
          heart_rate: r.avg_heart_rate,
        }))
      : aggregatedData.map((p) => ({
          date: p.date,
          output: p.avg_output,
          cadence: p.avg_cadence,
          resistance: p.avg_resistance,
          heart_rate: p.avg_heart_rate,
        }));

  const hasHeartRate = chartData.some((d) => d.heart_rate != null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trends</h2>
        <Tabs
          value={granularity}
          onValueChange={(v) => setGranularity(v as Granularity)}
        >
          <TabsList>
            <TabsTrigger value="raw">Raw Rides</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Avg</TabsTrigger>
            <TabsTrigger value="monthly">Monthly Avg</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TrendChart
          data={chartData}
          dataKey="output"
          label="Output"
          unit="kJ"
          color="hsl(var(--chart-1))"
        />
        <TrendChart
          data={chartData}
          dataKey="cadence"
          label="Avg Cadence"
          unit="RPM"
          color="hsl(var(--chart-2))"
        />
        <TrendChart
          data={chartData}
          dataKey="resistance"
          label="Avg Resistance"
          unit="%"
          color="hsl(var(--chart-3))"
        />
        {hasHeartRate && (
          <TrendChart
            data={chartData}
            dataKey="heart_rate"
            label="Avg Heart Rate"
            unit="BPM"
            color="hsl(var(--chart-4))"
          />
        )}
      </div>

      <WeeklyVolumeChart data={weeklyData} />
    </div>
  );
}
