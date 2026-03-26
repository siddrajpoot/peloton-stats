"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

interface CardDef {
  title: string;
  value: string;
  diff: string | null;
  isPositive: boolean | null;
}

function buildCards(
  stats: SummaryStats,
  prev: SummaryStats | null
): CardDef[] {
  function diffStr(
    current: number,
    previous: number | null,
    decimals: number,
    unit: string
  ): { diff: string | null; isPositive: boolean | null } {
    if (previous === null || previous === undefined)
      return { diff: null, isPositive: null };
    const delta = current - previous;
    if (delta === 0) return { diff: null, isPositive: null };
    const sign = delta > 0 ? "+" : "";
    return {
      diff: `${sign}${formatNumber(delta, decimals)} ${unit}`,
      isPositive: delta > 0,
    };
  }

  function diffDuration(
    current: number,
    previous: number | null
  ): { diff: string | null; isPositive: boolean | null } {
    if (previous === null || previous === undefined)
      return { diff: null, isPositive: null };
    const delta = current - previous;
    if (delta === 0) return { diff: null, isPositive: null };
    const sign = delta > 0 ? "+" : "-";
    return {
      diff: `${sign}${formatDuration(Math.abs(delta))}`,
      isPositive: delta > 0,
    };
  }

  const rides = diffStr(stats.total_rides, prev?.total_rides ?? null, 0, "");
  const output = diffStr(stats.total_output, prev?.total_output ?? null, 0, "kJ");
  const avgOutput = diffStr(stats.avg_output, prev?.avg_output ?? null, 0, "kJ");
  const calories = diffStr(stats.total_calories, prev?.total_calories ?? null, 0, "");
  const distance = diffStr(stats.total_distance, prev?.total_distance ?? null, 1, "mi");
  const duration = diffDuration(
    stats.total_duration_seconds,
    prev?.total_duration_seconds ?? null
  );

  const hrDiff =
    stats.avg_heart_rate != null && prev?.avg_heart_rate != null
      ? diffStr(stats.avg_heart_rate, prev.avg_heart_rate, 0, "BPM")
      : { diff: null, isPositive: null };
  // For HR, lower is generally better
  const hrPositive = hrDiff.isPositive !== null ? !hrDiff.isPositive : null;

  return [
    { title: "Total Rides", value: formatNumber(stats.total_rides), ...rides },
    { title: "Total Output", value: `${formatNumber(stats.total_output)} kJ`, ...output },
    { title: "Avg Output", value: `${formatNumber(stats.avg_output)} kJ`, ...avgOutput },
    { title: "Total Calories", value: formatNumber(stats.total_calories), ...calories },
    {
      title: "Total Distance",
      value: `${formatNumber(stats.total_distance, 1)} mi`,
      ...distance,
    },
    { title: "Time in Saddle", value: formatDuration(stats.total_duration_seconds), ...duration },
    {
      title: "Avg Heart Rate",
      value: stats.avg_heart_rate ? `${stats.avg_heart_rate} BPM` : "—",
      diff: hrDiff.diff,
      isPositive: hrPositive,
    },
  ];
}

export function SummaryCards({ refreshKey }: SummaryCardsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("week");
  const [cards, setCards] = useState<CardDef[]>([]);
  const [growth, setGrowth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (cards.length === 0) setLoading(true);
      const now = new Date();

      if (timeRange === "all") {
        const data = await fetchSummary();
        setCards(buildCards(data, null));
        setGrowth(null);
      } else if (timeRange === "year") {
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearSameDay = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());

        const [current, previous] = await Promise.all([
          fetchSummary(yearStart.toISOString(), now.toISOString()),
          fetchSummary(lastYearStart.toISOString(), lastYearSameDay.toISOString()),
        ]);
        setCards(buildCards(current, previous));
        setGrowth(calculateGrowth(current, previous));
      } else {
        const days = timeRange === "week" ? 7 : 30;
        const start = new Date(now);
        start.setDate(now.getDate() - days);
        const prevStart = new Date(now);
        prevStart.setDate(now.getDate() - days * 2);

        const [current, previous] = await Promise.all([
          fetchSummary(start.toISOString(), now.toISOString()),
          fetchSummary(prevStart.toISOString(), start.toISOString()),
        ]);
        setCards(buildCards(current, previous));
        setGrowth(calculateGrowth(current, previous));
      }
      setLoading(false);
    }
    load();
  }, [timeRange, refreshKey]);

  if (loading || cards.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-4">
        <GrowthIndicator
          percentage={growth}
          timeRange={
            timeRange === "week" ? "7 days" :
            timeRange === "month" ? "30 days" :
            timeRange === "year" ? "year" :
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
              {card.diff && (
                <p
                  className={`text-xs font-bold ${
                    card.isPositive
                      ? "text-emerald-300/70"
                      : card.isPositive === false
                      ? "text-red-600"
                      : "text-muted-foreground"
                  }`}
                >
                  {card.diff}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
