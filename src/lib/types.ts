export interface Ride {
  id: string;
  peloton_ride_id: string;
  title: string;
  instructor: string | null;
  class_type: string | null;
  duration_seconds: number;
  started_at: string;
  total_output: number;
  avg_cadence: number | null;
  max_cadence: number | null;
  avg_resistance: number | null;
  max_resistance: number | null;
  avg_heart_rate: number | null;
  max_heart_rate: number | null;
  calories: number | null;
  distance: number | null;
  avg_speed: number | null;
  max_speed: number | null;
  created_at: string;
}

export interface SyncLog {
  id: string;
  synced_at: string;
  status: "success" | "error";
  rides_added: number;
  error_message: string | null;
}

export type TimeRange = "week" | "month" | "year" | "all";

export type Granularity = "raw" | "weekly" | "monthly";

export interface SummaryStats {
  total_rides: number;
  total_output: number;
  avg_output: number;
  total_calories: number;
  total_distance: number;
  total_duration_seconds: number;
  avg_heart_rate: number | null;
}

export interface GrowthData {
  current: SummaryStats;
  previous: SummaryStats;
  percentage: number | null;
}

export interface PersonalRecord {
  label: string;
  value: number;
  unit: string;
  date: string;
}

export interface AggregatedPoint {
  date: string;
  avg_output: number | null;
  avg_cadence: number | null;
  avg_resistance: number | null;
  avg_heart_rate: number | null;
  total_output: number | null;
  ride_count: number;
}
