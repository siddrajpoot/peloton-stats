import type { SummaryStats } from "@/lib/types";

interface GrowthMetric {
  current: number;
  previous: number;
  weight: number;
}

function avgPowerWatts(outputKj: number, durationSec: number): number {
  if (durationSec === 0) return 0;
  return (outputKj * 1000) / durationSec;
}

function efficiencyFactor(outputKj: number, durationSec: number, avgHr: number): number {
  return avgPowerWatts(outputKj, durationSec) / avgHr;
}

function outputPerMinute(outputKj: number, durationSec: number): number {
  if (durationSec === 0) return 0;
  return outputKj / (durationSec / 60);
}

export function calculateGrowth(
  current: SummaryStats,
  previous: SummaryStats
): number | null {
  if (previous.total_rides === 0 || previous.total_duration_seconds === 0) return null;
  if (current.total_rides === 0 || current.total_duration_seconds === 0) return null;

  const metrics: GrowthMetric[] = [];

  const hasHr =
    current.avg_heart_rate != null &&
    previous.avg_heart_rate != null &&
    current.avg_heart_rate > 0 &&
    previous.avg_heart_rate > 0;

  if (hasHr) {
    metrics.push({
      current: efficiencyFactor(
        current.total_output,
        current.total_duration_seconds,
        current.avg_heart_rate!
      ),
      previous: efficiencyFactor(
        previous.total_output,
        previous.total_duration_seconds,
        previous.avg_heart_rate!
      ),
      weight: 0.35,
    });
  }

  metrics.push({
    current: outputPerMinute(current.total_output, current.total_duration_seconds),
    previous: outputPerMinute(previous.total_output, previous.total_duration_seconds),
    weight: hasHr ? 0.25 : 0.40,
  });

  metrics.push({
    current: current.total_duration_seconds,
    previous: previous.total_duration_seconds,
    weight: hasHr ? 0.20 : 0.30,
  });

  metrics.push({
    current: current.avg_output,
    previous: previous.avg_output,
    weight: hasHr ? 0.20 : 0.30,
  });

  const totalWeight = metrics.reduce((s, m) => s + m.weight, 0);
  const weightedChange = metrics.reduce((sum, { current: c, previous: p, weight }) => {
    if (p === 0) return sum;
    return sum + (((c - p) / p) * 100 * weight);
  }, 0);

  return Math.round((weightedChange / totalWeight) * 10) / 10;
}

export const GROWTH_DESCRIPTION =
  "Composite score comparing your recent riding to the prior period. " +
  "Factors in efficiency (power per heartbeat), intensity (output per minute), " +
  "total duration, and average output — weighted to reward getting fitter, not just riding more.";
