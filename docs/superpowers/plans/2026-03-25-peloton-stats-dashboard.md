# Peloton Stats Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page Next.js dashboard that syncs ride data from the unofficial Peloton API into Supabase and displays metrics, trends, and personal records.

**Architecture:** Next.js App Router with server-side API routes for Peloton sync and data queries. Supabase (Postgres) stores ride data. Frontend uses shadcn/ui components and Recharts-based charts. Single-user, no auth.

**Tech Stack:** Next.js 14+ (App Router), Supabase, shadcn/ui, Tailwind CSS, Recharts, Vercel

---

## File Structure

```
src/
  app/
    page.tsx                    — main dashboard page (composes all sections)
    layout.tsx                  — root layout with fonts, metadata
    api/
      sync/route.ts             — POST handler for manual + cron sync
      rides/route.ts            — GET handler for ride data + aggregations
  components/
    header.tsx                  — app title, last synced, sync button
    time-range-selector.tsx     — week/month/year/all-time toggle
    summary-cards.tsx           — stat cards grid
    growth-indicator.tsx        — composite growth % card
    trend-chart.tsx             — reusable line chart with rolling avg
    trend-charts-section.tsx    — all four metric charts + controls
    weekly-volume-chart.tsx     — bar chart for weekly volume
    personal-records.tsx        — all-time bests
    ride-table.tsx              — sortable/filterable data table
  lib/
    peloton.ts                  — Peloton API client (OAuth auth + fetch rides)
    supabase.ts                 — Supabase client (server-side)
    types.ts                    — shared TypeScript types
    queries.ts                  — Supabase query helpers for aggregations
    growth.ts                   — growth indicator calculation
    utils.ts                    — formatting helpers (duration, dates, etc.)
supabase/
  migrations/
    001_create_tables.sql       — rides + sync_log tables
vercel.json                     — cron job config
.env.local.example              — template for env vars
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/lib/supabase.ts`, `src/lib/types.ts`, `.env.local.example`, `vercel.json`

- [ ] **Step 1: Create Next.js project**

```bash
cd /Users/siddrajpoot/dev/personal/peloton-stats
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

Accept defaults. This creates the full Next.js project with App Router, TypeScript, Tailwind, and ESLint.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js
npx shadcn@latest init -d
```

The `shadcn init` will set up the component system with default config. Accept defaults.

- [ ] **Step 3: Install shadcn components we'll need**

```bash
npx shadcn@latest add card button table badge select tabs
npx shadcn@latest add chart
```

- [ ] **Step 4: Create environment variable template**

Create `.env.local.example`:

```env
# Peloton credentials
PELOTON_USERNAME=your_email@example.com
PELOTON_PASSWORD=your_password

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Cron secret (used by Vercel cron to authenticate)
CRON_SECRET=your-random-secret
```

- [ ] **Step 5: Create shared types**

Create `src/lib/types.ts`:

```typescript
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
```

- [ ] **Step 6: Create Supabase client**

Create `src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

- [ ] **Step 7: Create utility helpers**

Create `src/lib/utils.ts` (shadcn may have already created this with a `cn` helper — append to it):

```typescript
// These go AFTER the existing cn() export from shadcn

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatNumber(n: number, decimals = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function getDateRange(range: "week" | "month" | "year"): {
  current: { start: Date; end: Date };
  previous: { start: Date; end: Date };
} {
  const now = new Date();
  const currentStart = new Date(now);
  const previousStart = new Date(now);
  const previousEnd = new Date(now);

  if (range === "week") {
    const day = now.getDay();
    currentStart.setDate(now.getDate() - day);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setDate(currentStart.getDate() - 7);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else if (range === "month") {
    currentStart.setDate(1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setMonth(currentStart.getMonth() - 1, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  } else {
    currentStart.setMonth(0, 1);
    currentStart.setHours(0, 0, 0, 0);
    previousStart.setFullYear(currentStart.getFullYear() - 1, 0, 1);
    previousStart.setHours(0, 0, 0, 0);
    previousEnd.setTime(currentStart.getTime() - 1);
  }

  return {
    current: { start: currentStart, end: now },
    previous: { start: previousStart, end: previousEnd },
  };
}
```

- [ ] **Step 8: Create vercel.json for cron**

Create `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync?cron=true",
      "schedule": "0 6 * * *"
    }
  ]
}
```

- [ ] **Step 9: Update .gitignore and create .env.local**

Add `.env.local` to `.gitignore` if not already there. Create a real `.env.local` with your actual credentials (do NOT commit this).

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: App runs at `http://localhost:3000` with default Next.js page.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with shadcn/ui, Supabase, Tailwind"
```

---

### Task 2: Supabase Database Schema

**Files:**
- Create: `supabase/migrations/001_create_tables.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001_create_tables.sql`:

```sql
-- Rides table
CREATE TABLE IF NOT EXISTS rides (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  peloton_ride_id TEXT NOT NULL UNIQUE,
  title TEXT,
  instructor TEXT,
  class_type TEXT,
  duration_seconds INTEGER NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  total_output INTEGER NOT NULL DEFAULT 0,
  avg_cadence REAL,
  max_cadence REAL,
  avg_resistance REAL,
  max_resistance REAL,
  avg_heart_rate REAL,
  max_heart_rate REAL,
  calories REAL,
  distance REAL,
  avg_speed REAL,
  max_speed REAL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for time-range queries
CREATE INDEX IF NOT EXISTS idx_rides_started_at ON rides (started_at DESC);

-- Sync log table
CREATE TABLE IF NOT EXISTS sync_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('success', 'error')),
  rides_added INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_log_synced_at ON sync_log (synced_at DESC);
```

- [ ] **Step 2: Run migration against Supabase**

Go to your Supabase project dashboard > SQL Editor, paste the migration SQL, and run it. Alternatively, if using the Supabase CLI:

```bash
npx supabase db push
```

Verify: In the Supabase Table Editor, you should see `rides` and `sync_log` tables with the correct columns.

- [ ] **Step 3: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema for rides and sync_log tables"
```

---

### Task 3: Peloton API Client

**Files:**
- Create: `src/lib/peloton.ts`
- Test: `src/lib/__tests__/peloton.test.ts`

- [ ] **Step 1: Write the Peloton client**

Create `src/lib/peloton.ts`:

```typescript
const PELOTON_AUTH_URL = "https://api.onepeloton.com/auth/login";
const PELOTON_API_BASE = "https://api.onepeloton.com";

interface PelotonSession {
  sessionId: string;
  userId: string;
}

let cachedSession: PelotonSession | null = null;

async function authenticate(): Promise<PelotonSession> {
  if (cachedSession) return cachedSession;

  const res = await fetch(PELOTON_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username_or_email: process.env.PELOTON_USERNAME,
      password: process.env.PELOTON_PASSWORD,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Peloton auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  cachedSession = {
    sessionId: data.session_id,
    userId: data.user_id,
  };
  return cachedSession;
}

function clearSession() {
  cachedSession = null;
}

async function pelotonFetch(path: string): Promise<Response> {
  const session = await authenticate();
  const res = await fetch(`${PELOTON_API_BASE}${path}`, {
    headers: {
      Cookie: `peloton_session_id=${session.sessionId}`,
      "Content-Type": "application/json",
    },
  });

  if (res.status === 401) {
    clearSession();
    const newSession = await authenticate();
    return fetch(`${PELOTON_API_BASE}${path}`, {
      headers: {
        Cookie: `peloton_session_id=${newSession.sessionId}`,
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
  const session = await authenticate();
  const rides: PelotonRideData[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const res = await pelotonFetch(
      `/api/user/${session.userId}/workouts?joins=ride,ride.instructor&limit=50&page=${page}&sort_by=-created`
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch workouts page ${page}: ${res.status}`);
    }

    const data = await res.json();
    const workouts: PelotonWorkout[] = data.data;

    for (const workout of workouts) {
      // Only include cycling workouts that are complete
      if (
        workout.fitness_discipline !== "cycling" ||
        workout.status !== "COMPLETE"
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
        avg_heart_rate: findAvgSummary(perf.average_summaries, "avg_heart_rate"),
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/peloton.ts
git commit -m "feat: add Peloton API client with auth and ride fetching"
```

---

### Task 4: Sync API Route

**Files:**
- Create: `src/app/api/sync/route.ts`

- [ ] **Step 1: Write the sync route**

Create `src/app/api/sync/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchAllRides } from "@/lib/peloton";

export async function POST(request: NextRequest) {
  // Verify cron secret if this is a cron invocation
  const { searchParams } = new URL(request.url);
  const isCron = searchParams.get("cron") === "true";
  if (isCron) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Get last successful sync time
    const { data: lastSync } = await supabase
      .from("sync_log")
      .select("synced_at")
      .eq("status", "success")
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    const since = lastSync ? new Date(lastSync.synced_at) : undefined;

    // Fetch rides from Peloton
    const rides = await fetchAllRides(since);

    // Upsert rides into Supabase
    let ridesAdded = 0;
    if (rides.length > 0) {
      const { error, count } = await supabase
        .from("rides")
        .upsert(rides, { onConflict: "peloton_ride_id", count: "exact" });

      if (error) throw error;
      ridesAdded = count ?? rides.length;
    }

    // Log successful sync
    await supabase.from("sync_log").insert({
      status: "success",
      rides_added: ridesAdded,
    });

    return NextResponse.json({
      success: true,
      rides_added: ridesAdded,
      synced_at: new Date().toISOString(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";

    // Log failed sync
    await supabase.from("sync_log").insert({
      status: "error",
      rides_added: 0,
      error_message: message,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Support GET for Vercel cron (cron hits GET by default)
export async function GET(request: NextRequest) {
  return POST(request);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/sync/route.ts
git commit -m "feat: add sync API route for manual + cron Peloton sync"
```

---

### Task 5: Query Helpers and Rides API Route

**Files:**
- Create: `src/lib/queries.ts`, `src/app/api/rides/route.ts`

- [ ] **Step 1: Write query helpers**

Create `src/lib/queries.ts`:

```typescript
import { supabase } from "@/lib/supabase";
import type {
  Ride,
  SummaryStats,
  PersonalRecord,
  AggregatedPoint,
} from "@/lib/types";

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
  let query = supabase.from("rides").select("*");
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
    .select("*");
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
```

- [ ] **Step 2: Write the rides API route**

Create `src/app/api/rides/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getRides,
  getSummaryStats,
  getPersonalRecords,
  getAggregatedRides,
  getLastSyncTime,
} from "@/lib/queries";
import type { Granularity } from "@/lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "raw";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    if (view === "summary") {
      const stats = await getSummaryStats(from, to);
      return NextResponse.json(stats);
    }

    if (view === "records") {
      const records = await getPersonalRecords();
      return NextResponse.json(records);
    }

    if (view === "sync") {
      const lastSync = await getLastSyncTime();
      return NextResponse.json({ last_synced: lastSync });
    }

    if (view === "weekly" || view === "monthly") {
      const data = await getAggregatedRides(
        view as "weekly" | "monthly",
        from,
        to
      );
      return NextResponse.json(data);
    }

    // Default: raw rides
    const rides = await getRides({
      from,
      to,
      sortBy: searchParams.get("sort") ?? "started_at",
      order: (searchParams.get("order") as "asc" | "desc") ?? "desc",
    });
    return NextResponse.json(rides);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries.ts src/app/api/rides/route.ts
git commit -m "feat: add query helpers and rides API route"
```

---

### Task 6: Growth Indicator Logic

**Files:**
- Create: `src/lib/growth.ts`, `src/lib/__tests__/growth.test.ts`

- [ ] **Step 1: Write the test**

Create `src/lib/__tests__/growth.test.ts`:

```typescript
import { calculateGrowth } from "@/lib/growth";
import type { SummaryStats } from "@/lib/types";

describe("calculateGrowth", () => {
  it("returns positive growth when current period is better", () => {
    const current: SummaryStats = {
      total_rides: 6,
      total_output: 1800,
      avg_output: 300,
      total_calories: 3000,
      total_distance: 60,
      total_duration_seconds: 10800,
      avg_heart_rate: 145,
    };
    const previous: SummaryStats = {
      total_rides: 5,
      total_output: 1400,
      avg_output: 280,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: 150,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeGreaterThan(0);
  });

  it("returns negative growth when current period is worse", () => {
    const current: SummaryStats = {
      total_rides: 3,
      total_output: 600,
      avg_output: 200,
      total_calories: 1200,
      total_distance: 25,
      total_duration_seconds: 5400,
      avg_heart_rate: 155,
    };
    const previous: SummaryStats = {
      total_rides: 6,
      total_output: 1800,
      avg_output: 300,
      total_calories: 3000,
      total_distance: 60,
      total_duration_seconds: 10800,
      avg_heart_rate: 145,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeLessThan(0);
  });

  it("returns null when previous period has no rides", () => {
    const current: SummaryStats = {
      total_rides: 5,
      total_output: 1500,
      avg_output: 300,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: 145,
    };
    const previous: SummaryStats = {
      total_rides: 0,
      total_output: 0,
      avg_output: 0,
      total_calories: 0,
      total_distance: 0,
      total_duration_seconds: 0,
      avg_heart_rate: null,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeNull();
  });

  it("handles null heart rate gracefully", () => {
    const current: SummaryStats = {
      total_rides: 5,
      total_output: 1500,
      avg_output: 300,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: null,
    };
    const previous: SummaryStats = {
      total_rides: 5,
      total_output: 1400,
      avg_output: 280,
      total_calories: 2300,
      total_distance: 48,
      total_duration_seconds: 9000,
      avg_heart_rate: null,
    };

    const result = calculateGrowth(current, previous);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });
});
```

- [ ] **Step 2: Install test dependencies and run test to verify it fails**

```bash
npm install -D jest ts-jest @types/jest @jest/globals
npx ts-jest config:init
```

Update the generated `jest.config.js` to handle path aliases:

```javascript
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
```

```bash
npx jest src/lib/__tests__/growth.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/growth'`

- [ ] **Step 3: Implement growth calculation**

Create `src/lib/growth.ts`:

```typescript
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

  // Avg cadence (derived from total output and rides as proxy — we use avg_output here)
  // We already have avg_output above, so skip to avoid double-counting

  // Avg resistance — not directly in SummaryStats, so we skip for now
  // This can be added when we extend SummaryStats

  if (metrics.length === 0) return null;

  // Calculate percentage change for each metric, then average
  const changes = metrics.map(({ current: c, previous: p }) => {
    return ((c - p) / p) * 100;
  });

  const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
  return Math.round(avgChange * 10) / 10;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/__tests__/growth.test.ts
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/growth.ts src/lib/__tests__/growth.test.ts jest.config.js
git commit -m "feat: add growth indicator calculation with tests"
```

---

### Task 7: Dashboard — Header and Sync Button

**Files:**
- Create: `src/components/header.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the header component**

Create `src/components/header.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  lastSynced: string | null;
  onSyncComplete: () => void;
}

export function Header({ lastSynced, onSyncComplete }: HeaderProps) {
  const [syncing, setSyncing] = useState(false);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSyncComplete();
    } catch (err) {
      console.error("Sync failed:", err);
    } finally {
      setSyncing(false);
    }
  }

  const formattedSync = lastSynced
    ? new Date(lastSynced).toLocaleString()
    : "Never";

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <div>
        <h1 className="text-2xl font-bold">Peloton Stats</h1>
        <p className="text-sm text-muted-foreground">
          Last synced: {formattedSync}
        </p>
      </div>
      <Button onClick={handleSync} disabled={syncing} variant="outline">
        {syncing ? "Syncing..." : "Sync Now"}
      </Button>
    </header>
  );
}
```

- [ ] **Step 2: Set up the dashboard page shell**

Replace `src/app/page.tsx` with:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";

export default function Dashboard() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/rides?view=sync");
    const data = await res.json();
    setLastSynced(data.last_synced);
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus, refreshKey]);

  function handleSyncComplete() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header lastSynced={lastSynced} onSyncComplete={handleSyncComplete} />
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        {/* Summary cards, trend charts, ride table will go here */}
        <p className="text-muted-foreground">Dashboard sections coming soon...</p>
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Verify it renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify header shows "Peloton Stats", "Last synced: Never", and a "Sync Now" button.

- [ ] **Step 4: Commit**

```bash
git add src/components/header.tsx src/app/page.tsx
git commit -m "feat: add dashboard header with sync button"
```

---

### Task 8: Summary Cards with Time Range Selector

**Files:**
- Create: `src/components/time-range-selector.tsx`, `src/components/summary-cards.tsx`, `src/components/growth-indicator.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the time range selector**

Create `src/components/time-range-selector.tsx`:

```tsx
"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TimeRange } from "@/lib/types";

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(v) => onChange(v as TimeRange)}
    >
      <TabsList>
        <TabsTrigger value="week">This Week</TabsTrigger>
        <TabsTrigger value="month">This Month</TabsTrigger>
        <TabsTrigger value="year">This Year</TabsTrigger>
        <TabsTrigger value="all">All Time</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

- [ ] **Step 2: Build the growth indicator**

Create `src/components/growth-indicator.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrowthIndicatorProps {
  percentage: number | null;
  timeRange: string;
}

export function GrowthIndicator({
  percentage,
  timeRange,
}: GrowthIndicatorProps) {
  if (percentage === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">
            {timeRange === "all" ? "N/A for all time" : "No prior data"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = percentage >= 0;
  const arrow = isPositive ? "↑" : "↓";
  const color = isPositive ? "text-green-600" : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color}`}>
          {arrow} {isPositive ? "+" : ""}
          {percentage}%
        </p>
        <p className="text-xs text-muted-foreground">vs. previous {timeRange}</p>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Build the summary cards**

Create `src/components/summary-cards.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GrowthIndicator } from "@/components/growth-indicator";
import { TimeRangeSelector } from "@/components/time-range-selector";
import { calculateGrowth } from "@/lib/growth";
import { getDateRange, formatDuration, formatNumber } from "@/lib/utils";
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
      if (timeRange === "all") {
        const data = await fetchSummary();
        setStats(data);
        setGrowth(null);
      } else {
        const ranges = getDateRange(timeRange);
        const [current, previous] = await Promise.all([
          fetchSummary(
            ranges.current.start.toISOString(),
            ranges.current.end.toISOString()
          ),
          fetchSummary(
            ranges.previous.start.toISOString(),
            ranges.previous.end.toISOString()
          ),
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
        <GrowthIndicator percentage={growth} timeRange={timeRange} />
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
```

- [ ] **Step 4: Wire summary cards into dashboard page**

Update `src/app/page.tsx` — replace the placeholder in `<main>`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { SummaryCards } from "@/components/summary-cards";

export default function Dashboard() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/rides?view=sync");
    const data = await res.json();
    setLastSynced(data.last_synced);
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus, refreshKey]);

  function handleSyncComplete() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header lastSynced={lastSynced} onSyncComplete={handleSyncComplete} />
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <SummaryCards refreshKey={refreshKey} />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Verify it renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify time range tabs appear and summary cards render (values will be 0/empty until data is synced).

- [ ] **Step 6: Commit**

```bash
git add src/components/time-range-selector.tsx src/components/growth-indicator.tsx src/components/summary-cards.tsx src/app/page.tsx
git commit -m "feat: add summary cards with time range selector and growth indicator"
```

---

### Task 9: Trend Charts

**Files:**
- Create: `src/components/trend-chart.tsx`, `src/components/trend-charts-section.tsx`, `src/components/weekly-volume-chart.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the reusable trend chart component**

Create `src/components/trend-chart.tsx`:

```tsx
"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ComposedChart,
} from "recharts";

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  label: string;
  unit: string;
  color?: string;
}

export function TrendChart({
  data,
  dataKey,
  label,
  unit,
  color = "hsl(var(--chart-1))",
}: TrendChartProps) {
  // Compute rolling average (7-ride window)
  const withRollingAvg = data.map((point, i) => {
    const window = data.slice(Math.max(0, i - 6), i + 1);
    const validValues = window
      .map((w) => w[dataKey] as number | null)
      .filter((v): v is number => v != null);
    const avg =
      validValues.length > 0
        ? validValues.reduce((s, v) => s + v, 0) / validValues.length
        : null;
    return { ...point, rollingAvg: avg };
  });

  const chartConfig = {
    [dataKey]: { label, color },
    rollingAvg: { label: `${label} (7-ride avg)`, color },
  };

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium">{label} ({unit})</h3>
      <ChartContainer config={chartConfig} className="h-[250px] w-full">
        <ComposedChart data={withRollingAvg}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis tick={{ fontSize: 12 }} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Scatter
            dataKey={dataKey}
            fill={color}
            opacity={0.3}
            r={2}
          />
          <Line
            type="monotone"
            dataKey="rollingAvg"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}
```

- [ ] **Step 2: Build the weekly volume bar chart**

Create `src/components/weekly-volume-chart.tsx`:

```tsx
"use client";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { AggregatedPoint } from "@/lib/types";

interface WeeklyVolumeChartProps {
  data: AggregatedPoint[];
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const chartConfig = {
    ride_count: {
      label: "Rides",
      color: "hsl(var(--chart-1))",
    },
    total_output: {
      label: "Total Output (kJ)",
      color: "hsl(var(--chart-2))",
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
            tickFormatter={(v: string) =>
              new Date(v).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            }
          />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            yAxisId="left"
            dataKey="ride_count"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            yAxisId="right"
            dataKey="total_output"
            fill="hsl(var(--chart-2))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ChartContainer>
    </div>
  );
}
```

- [ ] **Step 3: Build the trend charts section with controls**

Create `src/components/trend-charts-section.tsx`:

```tsx
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
```

- [ ] **Step 4: Wire into dashboard page**

Update `src/app/page.tsx` — add the import and component:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { SummaryCards } from "@/components/summary-cards";
import { TrendChartsSection } from "@/components/trend-charts-section";

export default function Dashboard() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/rides?view=sync");
    const data = await res.json();
    setLastSynced(data.last_synced);
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus, refreshKey]);

  function handleSyncComplete() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header lastSynced={lastSynced} onSyncComplete={handleSyncComplete} />
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <SummaryCards refreshKey={refreshKey} />
        <TrendChartsSection refreshKey={refreshKey} />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Verify charts render**

```bash
npm run dev
```

Open `http://localhost:3000`. Charts should render (empty until data synced). No console errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/trend-chart.tsx src/components/weekly-volume-chart.tsx src/components/trend-charts-section.tsx src/app/page.tsx
git commit -m "feat: add trend charts with granularity controls and weekly volume"
```

---

### Task 10: Personal Records and Ride History Table

**Files:**
- Create: `src/components/personal-records.tsx`, `src/components/ride-table.tsx`
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build personal records component**

Create `src/components/personal-records.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/utils";
import type { PersonalRecord } from "@/lib/types";

interface PersonalRecordsProps {
  refreshKey: number;
}

export function PersonalRecords({ refreshKey }: PersonalRecordsProps) {
  const [records, setRecords] = useState<PersonalRecord[]>([]);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/rides?view=records");
      setRecords(await res.json());
    }
    load();
  }, [refreshKey]);

  if (records.length === 0) return null;

  function formatValue(record: PersonalRecord): string {
    if (record.unit === "seconds") return formatDuration(record.value);
    return `${record.value} ${record.unit}`;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Personal Records</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {records.map((record) => (
          <Card key={record.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {record.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatValue(record)}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(record.date).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build the ride history table**

Create `src/components/ride-table.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/utils";
import type { Ride } from "@/lib/types";

interface RideTableProps {
  refreshKey: number;
}

type SortField =
  | "started_at"
  | "duration_seconds"
  | "total_output"
  | "avg_cadence"
  | "avg_resistance"
  | "avg_heart_rate"
  | "calories"
  | "distance";

export function RideTable({ refreshKey }: RideTableProps) {
  const [rides, setRides] = useState<Ride[]>([]);
  const [sortField, setSortField] = useState<SortField>("started_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams({
        sort: sortField,
        order: sortOrder,
      });
      const res = await fetch(`/api/rides?${params}`);
      setRides(await res.json());
    }
    load();
  }, [sortField, sortOrder, refreshKey]);

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  const sortIndicator = (field: SortField) =>
    field === sortField ? (sortOrder === "asc" ? " ↑" : " ↓") : "";

  const columns: Array<{ field: SortField; label: string }> = [
    { field: "started_at", label: "Date" },
    { field: "duration_seconds", label: "Duration" },
    { field: "total_output", label: "Output (kJ)" },
    { field: "avg_cadence", label: "Avg Cadence" },
    { field: "avg_resistance", label: "Avg Resistance" },
    { field: "avg_heart_rate", label: "Avg HR" },
    { field: "calories", label: "Calories" },
    { field: "distance", label: "Distance (mi)" },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Ride History</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.field}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-medium"
                    onClick={() => handleSort(col.field)}
                  >
                    {col.label}
                    {sortIndicator(col.field)}
                  </Button>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rides.map((ride) => (
              <TableRow key={ride.id}>
                <TableCell>
                  {new Date(ride.started_at).toLocaleDateString()}
                </TableCell>
                <TableCell>{formatDuration(ride.duration_seconds)}</TableCell>
                <TableCell>{ride.total_output}</TableCell>
                <TableCell>
                  {ride.avg_cadence != null
                    ? Math.round(ride.avg_cadence)
                    : "—"}
                </TableCell>
                <TableCell>
                  {ride.avg_resistance != null
                    ? `${Math.round(ride.avg_resistance)}%`
                    : "—"}
                </TableCell>
                <TableCell>
                  {ride.avg_heart_rate != null
                    ? Math.round(ride.avg_heart_rate)
                    : "—"}
                </TableCell>
                <TableCell>
                  {ride.calories != null
                    ? Math.round(ride.calories)
                    : "—"}
                </TableCell>
                <TableCell>
                  {ride.distance != null
                    ? ride.distance.toFixed(1)
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
            {rides.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground"
                >
                  No rides yet. Hit Sync Now to pull your data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Wire into dashboard page**

Update `src/app/page.tsx` — final version:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Header } from "@/components/header";
import { SummaryCards } from "@/components/summary-cards";
import { TrendChartsSection } from "@/components/trend-charts-section";
import { PersonalRecords } from "@/components/personal-records";
import { RideTable } from "@/components/ride-table";

export default function Dashboard() {
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSyncStatus = useCallback(async () => {
    const res = await fetch("/api/rides?view=sync");
    const data = await res.json();
    setLastSynced(data.last_synced);
  }, []);

  useEffect(() => {
    fetchSyncStatus();
  }, [fetchSyncStatus, refreshKey]);

  function handleSyncComplete() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <Header lastSynced={lastSynced} onSyncComplete={handleSyncComplete} />
      <main className="mx-auto max-w-7xl space-y-8 p-6">
        <SummaryCards refreshKey={refreshKey} />
        <TrendChartsSection refreshKey={refreshKey} />
        <PersonalRecords refreshKey={refreshKey} />
        <RideTable refreshKey={refreshKey} />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify everything renders**

```bash
npm run dev
```

Open `http://localhost:3000`. Full dashboard should render: header, summary cards, trend charts, personal records, ride table. All sections show empty/zero state until data is synced.

- [ ] **Step 5: Commit**

```bash
git add src/components/personal-records.tsx src/components/ride-table.tsx src/app/page.tsx
git commit -m "feat: add personal records and ride history table"
```

---

### Task 11: End-to-End Verification

- [ ] **Step 1: Set up real .env.local**

Create `.env.local` with your actual Peloton credentials and Supabase connection details:

```env
PELOTON_USERNAME=your_real_email
PELOTON_PASSWORD=your_real_password
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-real-key
CRON_SECRET=any-random-string-here
```

- [ ] **Step 2: Run the app and trigger a sync**

```bash
npm run dev
```

Open `http://localhost:3000`. Click "Sync Now". Watch the network tab — the sync should:
1. Authenticate with Peloton
2. Fetch your ride history
3. Insert rides into Supabase
4. Update the last synced timestamp

- [ ] **Step 3: Verify dashboard populates**

After sync completes, the page should refresh and show:
- Summary cards with real numbers
- Trend charts with your ride data plotted
- Personal records populated
- Ride history table with all your rides

- [ ] **Step 4: Verify time range selector works**

Toggle between Week/Month/Year/All Time. Summary card values should change. Growth indicator should show a percentage for week/month/year and hide for all time.

- [ ] **Step 5: Final commit with any fixes**

```bash
git add -A
git commit -m "chore: finalize dashboard for end-to-end verification"
```

---

### Task 12: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Connect to Vercel**

Go to [vercel.com](https://vercel.com), import the `peloton-stats` repo, and configure environment variables:
- `PELOTON_USERNAME`
- `PELOTON_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

- [ ] **Step 3: Verify deployment**

After deploy, open the Vercel URL. Click Sync Now and verify the dashboard works in production.

- [ ] **Step 4: Verify cron**

Check Vercel dashboard > Cron Jobs to confirm the daily sync cron is registered and scheduled for 6:00 AM UTC.
