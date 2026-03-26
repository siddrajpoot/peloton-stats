"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
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
      setLoading(false);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-9 w-72" />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="mb-2 h-4 w-32" />
              <Skeleton className="h-[250px] w-full rounded-md" />
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="mb-2 h-4 w-32" />
          <Skeleton className="h-[250px] w-full rounded-md" />
        </div>
      </div>
    );
  }

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
          color="#E0736E"
        />
        <TrendChart
          data={chartData}
          dataKey="cadence"
          label="Avg Cadence"
          unit="RPM"
          color="#6BB8D6"
        />
        <TrendChart
          data={chartData}
          dataKey="resistance"
          label="Avg Resistance"
          unit="%"
          color="#7ACC8A"
        />
        {hasHeartRate && (
          <TrendChart
            data={chartData}
            dataKey="heart_rate"
            label="Avg Heart Rate"
            unit="BPM"
            color="#B48ADB"
          />
        )}
      </div>

      <WeeklyVolumeChart data={weeklyData} />
    </div>
  );
}
