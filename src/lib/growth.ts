import type { SummaryStats } from "@/lib/types";

export function calculateGrowth(
  current: SummaryStats,
  previous: SummaryStats
): number | null {
  // Can't compare if no previous data
  if (previous.total_rides === 0) return null;

  const metrics: Array<{
    current: number;
    previous: number;
  }> = [];

  // Avg output per ride
  if (current.avg_output > 0 && previous.avg_output > 0) {
    metrics.push({
      current: current.avg_output,
      previous: previous.avg_output,
    });
  }

  // Total rides
  metrics.push({
    current: current.total_rides,
    previous: previous.total_rides,
  });

  // Total duration
  if (current.total_duration_seconds > 0 && previous.total_duration_seconds > 0) {
    metrics.push({
      current: current.total_duration_seconds,
      previous: previous.total_duration_seconds,
    });
  }

  // HR efficiency (output / avg HR) — higher is better
  if (
    current.avg_heart_rate != null &&
    previous.avg_heart_rate != null &&
    current.avg_heart_rate > 0 &&
    previous.avg_heart_rate > 0
  ) {
    metrics.push({
      current: current.avg_output / current.avg_heart_rate,
      previous: previous.avg_output / previous.avg_heart_rate,
    });
  }

  if (metrics.length === 0) return null;

  // Calculate percentage change for each metric, then average
  const changes = metrics.map(({ current: c, previous: p }) => {
    return ((c - p) / p) * 100;
  });

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  return Math.round(avgChange * 10) / 10;
}
