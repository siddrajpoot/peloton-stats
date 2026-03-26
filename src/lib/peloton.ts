const PELOTON_OAUTH_URL = "https://auth.onepeloton.com/oauth/token";
const PELOTON_API_BASE = "https://api.onepeloton.com";
const PELOTON_CLIENT_ID = "mgsmWCD0A8Qn6uz6mmqI6qeBNHH9IPwS";

interface PelotonAuth {
  accessToken: string;
  refreshToken: string;
  userId: string | null;
}

let cachedAuth: PelotonAuth | null = null;

async function authenticate(): Promise<PelotonAuth> {
  if (cachedAuth) return cachedAuth;

  const res = await fetch(PELOTON_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "password",
      client_id: PELOTON_CLIENT_ID,
      scope: "offline_access openid",
      username: process.env.PELOTON_USERNAME!,
      password: process.env.PELOTON_PASSWORD!,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Peloton auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedAuth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    userId: null,
  };

  // Fetch user ID from /api/me
  const meRes = await fetch(`${PELOTON_API_BASE}/api/me`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });
  if (meRes.ok) {
    const me = await meRes.json();
    cachedAuth.userId = me.id;
  }

  return cachedAuth;
}

async function refreshAuth(): Promise<PelotonAuth> {
  if (!cachedAuth?.refreshToken) {
    cachedAuth = null;
    return authenticate();
  }

  const res = await fetch(PELOTON_OAUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: PELOTON_CLIENT_ID,
      refresh_token: cachedAuth.refreshToken,
    }),
  });

  if (!res.ok) {
    cachedAuth = null;
    return authenticate();
  }

  const data = await res.json();
  cachedAuth = {
    ...cachedAuth,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? cachedAuth.refreshToken,
  };
  return cachedAuth;
}

function clearAuth() {
  cachedAuth = null;
}

async function pelotonFetch(path: string): Promise<Response> {
  const auth = await authenticate();
  const res = await fetch(`${PELOTON_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    const newAuth = await refreshAuth();
    return fetch(`${PELOTON_API_BASE}${path}`, {
      headers: {
        Authorization: `Bearer ${newAuth.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  return res;
}

interface PelotonWorkout {
  id: string;
  status: string;
  fitness_discipline: string;
  created_at: number;
  start_time: number;
  total_work: number;
  ride?: {
    title: string;
    duration: number;
    instructor?: { name: string };
    fitness_discipline_display_name: string;
  };
}

interface PelotonPerformance {
  summaries: Array<{ slug: string; value: number | null }>;
  average_summaries: Array<{ slug: string; value: number | null }>;
  metrics: Array<{
    slug: string;
    max_value: number | null;
    average_value: number | null;
  }>;
}

export interface PelotonRideData {
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
}

function findMetric(
  metrics: PelotonPerformance["metrics"],
  slug: string
): { max_value: number | null; average_value: number | null } | undefined {
  return metrics.find((m) => m.slug === slug);
}

function findSummary(
  summaries: PelotonPerformance["summaries"],
  slug: string
): number | null {
  return summaries.find((s) => s.slug === slug)?.value ?? null;
}

function findAvgSummary(
  averages: PelotonPerformance["average_summaries"],
  slug: string
): number | null {
  return averages.find((s) => s.slug === slug)?.value ?? null;
}

async function fetchPerformance(
  workoutId: string
): Promise<PelotonPerformance> {
  const res = await pelotonFetch(
    `/api/workout/${workoutId}/performance_graph?every_n=60`
  );
  if (!res.ok) {
    throw new Error(`Failed to fetch performance for ${workoutId}: ${res.status}`);
  }
  return res.json();
}

export async function fetchAllRides(
  since?: Date
): Promise<PelotonRideData[]> {
  const auth = await authenticate();
  if (!auth.userId) {
    throw new Error("Failed to get Peloton user ID");
  }
  const rides: PelotonRideData[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await pelotonFetch(
      `/api/user/${auth.userId}/workouts?joins=ride,ride.instructor&limit=50&page=${page}&sort_by=-created`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch workouts page ${page}: ${res.status}`);
    }

    const data = await res.json();
    const workouts: PelotonWorkout[] = data.data;

    for (const workout of workouts) {
      // Only include cycling workouts that are complete
      const rideDuration = workout.ride?.duration ?? 0;
      if (
        workout.fitness_discipline !== "cycling" ||
        workout.status !== "COMPLETE" ||
        rideDuration < 360
      ) {
        continue;
      }

      const startedAt = new Date(workout.start_time * 1000);

      // If we have a since date and this ride is older, stop
      if (since && startedAt <= since) {
        hasMore = false;
        break;
      }

      // Fetch detailed performance metrics
      const perf = await fetchPerformance(workout.id);

      const cadence = findMetric(perf.metrics, "cadence");
      const resistance = findMetric(perf.metrics, "resistance");
      const heartRate = findMetric(perf.metrics, "heart_rate");
      const speed = findMetric(perf.metrics, "speed");

      rides.push({
        peloton_ride_id: workout.id,
        title: workout.ride?.title ?? "Untitled Ride",
        instructor: workout.ride?.instructor?.name ?? null,
        class_type:
          workout.ride?.fitness_discipline_display_name ?? null,
        duration_seconds: workout.ride?.duration ?? 0,
        started_at: startedAt.toISOString(),
        total_output: Math.round(workout.total_work / 1000),
        avg_cadence: findAvgSummary(perf.average_summaries, "avg_cadence"),
        max_cadence: cadence?.max_value ?? null,
        avg_resistance: findAvgSummary(perf.average_summaries, "avg_resistance"),
        max_resistance: resistance?.max_value ?? null,
        avg_heart_rate: heartRate?.average_value ?? null,
        max_heart_rate: heartRate?.max_value ?? null,
        calories: findSummary(perf.summaries, "calories"),
        distance: findSummary(perf.summaries, "distance"),
        avg_speed: findAvgSummary(perf.average_summaries, "avg_speed"),
        max_speed: speed?.max_value ?? null,
      });
    }

    if (hasMore) {
      page++;
      hasMore = page < data.page_count;
    }
  }

  return rides;
}

