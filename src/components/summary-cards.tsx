"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthIndicator } from "@/components/growth-indicator";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { calculateGrowth } from "@/lib/growth";
import { formatDuration, formatNumber } from "@/lib/utils";
import type { TimeRange, SummaryStats } from "@/lib/types";

interface SummaryCardsProps {
  refreshKey: number;
}

async function fetchSummary(from?: string, to?: string): Promise<SummaryStats> {
  const params = new URLSearchParams({ view: "summary" });
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const res = await fetch(`/api/rides?${params}`);
  return res.json();
}

export function SummaryCards({ refreshKey }: SummaryCardsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [growth, setGrowth] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const now = new Date();

      if (timeRange === "all") {
        const data = await fetchSummary();
        setStats(data);
        // Growth: rolling 7 days vs prior 7 days
        const d7 = new Date(now);
        d7.setDate(now.getDate() - 7);
        const d14 = new Date(now);
        d14.setDate(now.getDate() - 14);
        const [cur, prev] = await Promise.all([
          fetchSummary(d7.toISOString(), now.toISOString()),
          fetchSummary(d14.toISOString(), d7.toISOString()),
        ]);
        setGrowth(calculateGrowth(cur, prev));
      } else {
        const days = timeRange === "week" ? 7 : timeRange === "month" ? 30 : 365;
        const start = new Date(now);
        start.setDate(now.getDate() - days);
        const prevStart = new Date(now);
        prevStart.setDate(now.getDate() - days * 2);

        const [current, previous] = await Promise.all([
          fetchSummary(start.toISOString(), now.toISOString()),
          fetchSummary(prevStart.toISOString(), start.toISOString()),
        ]);
        setStats(current);
        setGrowth(calculateGrowth(current, previous));
      }
    }
    load();
  }, [timeRange, refreshKey]);

  if (!stats) return null;

  const cards = [
    { title: "Total Rides", value: formatNumber(stats.total_rides) },
    { title: "Total Output", value: `${formatNumber(stats.total_output)} kJ` },
    { title: "Avg Output", value: `${formatNumber(stats.avg_output)} kJ` },
    {
      title: "Total Calories",
      value: formatNumber(stats.total_calories),
    },
    {
      title: "Total Distance",
      value: `${formatNumber(stats.total_distance, 1)} mi`,
    },
    {
      title: "Time in Saddle",
      value: formatDuration(stats.total_duration_seconds),
    },
    {
      title: "Avg Heart Rate",
      value: stats.avg_heart_rate
        ? `${stats.avg_heart_rate} BPM`
        : "—",
    },
  ];

  return (
    <div className="space-y-4">
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        <GrowthIndicator
          percentage={growth}
          timeRange={
            timeRange === "week" ? "7 days" :
            timeRange === "month" ? "30 days" :
            timeRange === "year" ? "365 days" :
            "7 days"
          }
        />
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
