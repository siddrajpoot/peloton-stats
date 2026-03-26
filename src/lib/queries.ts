import { supabase } from "@/lib/supabase";
import type {
  Ride,
  SummaryStats,
  PersonalRecord,
  AggregatedPoint,
} from "@/lib/types";

const MIN_RIDE_DURATION = 420;
const MIN_RIDE_OUTPUT = 10;

export async function getRides(options?: {
  from?: string;
  to?: string;
  sortBy?: string;
  order?: "asc" | "desc";
  limit?: number;
}): Promise<Ride[]> {
  let query = supabase
    .from("rides")
    .select("*")
    .gte("duration_seconds", MIN_RIDE_DURATION)
    .gte("total_output", MIN_RIDE_OUTPUT)
    .order(options?.sortBy ?? "started_at", {
      ascending: options?.order === "asc",
    });

  if (options?.from) query = query.gte("started_at", options.from);
  if (options?.to) query = query.lte("started_at", options.to);
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return data as Ride[];
}

export async function getSummaryStats(
  from?: string,
  to?: string
): Promise<SummaryStats> {
  let query = supabase.from("rides").select("*").gte("duration_seconds", MIN_RIDE_DURATION)
    .gte("total_output", MIN_RIDE_OUTPUT);
  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const { data, error } = await query;
  if (error) throw error;

  const rides = data as Ride[];
  if (rides.length === 0) {
    return {
      total_rides: 0,
      total_output: 0,
      avg_output: 0,
      total_calories: 0,
      total_distance: 0,
      total_duration_seconds: 0,
      avg_heart_rate: null,
    };
  }

  const total_output = rides.reduce((sum, r) => sum + r.total_output, 0);
  const total_calories = rides.reduce(
    (sum, r) => sum + (r.calories ?? 0),
    0
  );
  const total_distance = rides.reduce(
    (sum, r) => sum + (r.distance ?? 0),
    0
  );
  const total_duration = rides.reduce(
    (sum, r) => sum + r.duration_seconds,
    0
  );

  const hrRides = rides.filter((r) => r.avg_heart_rate != null);
  const avg_hr =
    hrRides.length > 0
      ? hrRides.reduce((sum, r) => sum + r.avg_heart_rate!, 0) /
        hrRides.length
      : null;

  return {
    total_rides: rides.length,
    total_output,
    avg_output: Math.round(total_output / rides.length),
    total_calories: Math.round(total_calories),
    total_distance: Math.round(total_distance * 10) / 10,
    total_duration_seconds: total_duration,
    avg_heart_rate: avg_hr ? Math.round(avg_hr) : null,
  };
}

export async function getPersonalRecords(): Promise<PersonalRecord[]> {
  const { data, error } = await supabase
    .from("rides")
    .select("*")
    .gte("duration_seconds", MIN_RIDE_DURATION)
    .gte("total_output", MIN_RIDE_OUTPUT);
  if (error) throw error;

  const rides = data as Ride[];
  if (rides.length === 0) return [];

  const records: PersonalRecord[] = [];

  // Highest output
  const maxOutput = rides.reduce((best, r) =>
    r.total_output > best.total_output ? r : best
  );
  records.push({
    label: "Highest Output",
    value: maxOutput.total_output,
    unit: "kJ",
    date: maxOutput.started_at,
  });

  // Highest avg cadence
  const cadenceRides = rides.filter((r) => r.avg_cadence != null);
  if (cadenceRides.length > 0) {
    const maxCadence = cadenceRides.reduce((best, r) =>
      r.avg_cadence! > best.avg_cadence! ? r : best
    );
    records.push({
      label: "Highest Avg Cadence",
      value: Math.round(maxCadence.avg_cadence!),
      unit: "RPM",
      date: maxCadence.started_at,
    });
  }

  // Highest avg resistance
  const resistanceRides = rides.filter((r) => r.avg_resistance != null);
  if (resistanceRides.length > 0) {
    const maxResistance = resistanceRides.reduce((best, r) =>
      r.avg_resistance! > best.avg_resistance! ? r : best
    );
    records.push({
      label: "Highest Avg Resistance",
      value: Math.round(maxResistance.avg_resistance!),
      unit: "%",
      date: maxResistance.started_at,
    });
  }

  // Longest ride
  const longestRide = rides.reduce((best, r) =>
    r.duration_seconds > best.duration_seconds ? r : best
  );
  records.push({
    label: "Longest Ride",
    value: longestRide.duration_seconds,
    unit: "seconds",
    date: longestRide.started_at,
  });

  return records;
}

export async function getAggregatedRides(
  granularity: "weekly" | "monthly",
  from?: string,
  to?: string
): Promise<AggregatedPoint[]> {
  let query = supabase
    .from("rides")
    .select("*")
    .gte("duration_seconds", MIN_RIDE_DURATION)
    .gte("total_output", MIN_RIDE_OUTPUT)
    .order("started_at", { ascending: true });

  if (from) query = query.gte("started_at", from);
  if (to) query = query.lte("started_at", to);

  const { data, error } = await query;
  if (error) throw error;

  const rides = data as Ride[];
  const buckets = new Map<string, Ride[]>();

  for (const ride of rides) {
    const date = new Date(ride.started_at);
    let key: string;

    if (granularity === "weekly") {
      // Get Monday of the week
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      monday.setDate(monday.getDate() + diff);
      key = monday.toISOString().split("T")[0];
    } else {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    }

    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(ride);
  }

  return Array.from(buckets.entries()).map(([date, group]) => {
    const avgField = (fn: (r: Ride) => number | null) => {
      const valid = group.filter((r) => fn(r) != null);
      if (valid.length === 0) return null;
      return valid.reduce((s, r) => s + fn(r)!, 0) / valid.length;
    };

    return {
      date,
      avg_output: Math.round(
        group.reduce((s, r) => s + r.total_output, 0) / group.length
      ),
      avg_cadence: avgField((r) => r.avg_cadence),
      avg_resistance: avgField((r) => r.avg_resistance),
      avg_heart_rate: avgField((r) => r.avg_heart_rate),
      total_output: group.reduce((s, r) => s + r.total_output, 0),
      ride_count: group.length,
    };
  });
}

export async function getLastSyncTime(): Promise<string | null> {
  const { data } = await supabase
    .from("sync_log")
    .select("synced_at")
    .eq("status", "success")
    .order("synced_at", { ascending: false })
    .limit(1)
    .single();

  return data?.synced_at ?? null;
}
