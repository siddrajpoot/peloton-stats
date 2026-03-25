# Peloton Stats Dashboard — Design Spec

## Overview

A single-page Next.js dashboard for tracking personal Peloton bike ride data. The app is data-driven, focused on metrics and trends — not coaching. Single user (no auth system). Data sourced from the unofficial Peloton API and stored in Supabase (Postgres).

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Database:** Supabase (Postgres)
- **UI:** shadcn/ui (includes Recharts-based chart components)
- **Styling:** Tailwind CSS
- **Hosting:** Vercel
- **Data Source:** Unofficial Peloton API

## Dashboard Layout

Single page, top-to-bottom:

### 1. Header Bar

- App title
- "Last synced: [timestamp]" display
- "Sync Now" button (manual trigger)

### 2. Summary Cards

A row of quick-glance stat cards. All cards are filtered by a shared time range selector: **this week / this month / this year / all time**.

Cards:

- **Growth Indicator** — a weighted percentage change comparing the selected period to the equivalent prior period (this week vs. last week, this month vs. last month, etc.). Composite of avg output, avg HR efficiency, total rides, total duration, avg cadence, avg resistance. Displayed as a prominent +/- percentage with a directional arrow (green for up, red for down). Exact weighting starts at equal weights and will be tuned over time.
- **Total Rides**
- **Total Output (kJ)**
- **Avg Output per Ride (kJ)**
- **Total Calories**
- **Total Distance**
- **Total Time in Saddle**
- **Avg Heart Rate (BPM)**

### 3. Trend Charts

Line/area charts showing progression over the full ride history (not filtered by the summary card time range — these always show the big picture).

**Per-metric charts (dots per ride + rolling average line):**

- Output per ride (kJ)
- Avg cadence (RPM)
- Avg resistance (%)
- Avg heart rate (BPM) — hidden if no HR data

**Shared chart controls:**

- Granularity toggle: raw rides / weekly average / monthly average
- Date range selector to zoom into a specific period (defaults to all-time)

**Additional trend views:**

- **Weekly Volume** — bar chart showing total rides + total output per week
- **Personal Records** — highlights of all-time bests: highest output, highest avg cadence, highest avg resistance, longest ride

### 4. Ride History Table

- Sortable, filterable table of all rides
- Columns: date, duration, output, avg cadence, avg resistance, avg HR, calories, distance
- Serves as drill-down for inspecting specific rides

## Data Model

### `rides` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| peloton_ride_id | text | Unique ID from Peloton (for dedup) |
| title | text | Ride/class title |
| instructor | text | Instructor name |
| class_type | text | e.g. cycling, power zone, HIIT |
| duration_seconds | integer | Ride duration |
| started_at | timestamptz | When the ride started |
| total_output | integer | Total output in kJ |
| avg_cadence | real | Average cadence RPM |
| max_cadence | real | Max cadence RPM |
| avg_resistance | real | Average resistance % |
| max_resistance | real | Max resistance % |
| avg_heart_rate | real | Average heart rate BPM |
| max_heart_rate | real | Max heart rate BPM |
| calories | real | Calories burned |
| distance | real | Distance in miles |
| avg_speed | real | Average speed |
| max_speed | real | Max speed |
| created_at | timestamptz | Row creation timestamp |

### `sync_log` table

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| synced_at | timestamptz | When the sync ran |
| status | text | success / error |
| rides_added | integer | Number of new rides ingested |
| error_message | text | Error details if failed |

## Sync Behavior

- **Manual sync:** "Sync Now" button calls a Next.js API route (`/api/sync`) which fetches rides from the Peloton API newer than the last successful sync and upserts them into Supabase.
- **Scheduled sync:** Vercel cron job runs once daily, calls the same sync endpoint.
- **Initial sync:** First sync pulls entire ride history from Peloton.
- **Credentials:** Peloton username and password stored as Vercel environment variables. No OAuth flow needed (single user).
- **Last synced display:** Header reads the most recent successful entry from `sync_log`.

## API Routes

- `POST /api/sync` — triggers a sync from Peloton API to Supabase. Returns count of new rides added and sync timestamp.
- `GET /api/rides` — returns ride data with optional query params for date range, sorting, and aggregation type (raw, weekly avg, monthly avg). Aggregations computed via SQL.

## Project Structure

```
src/
  app/
    page.tsx              — dashboard page
    layout.tsx            — root layout
    api/
      sync/route.ts       — manual + cron sync endpoint
      rides/route.ts      — query rides + aggregations
  components/
    header.tsx            — title, sync status, sync button
    summary-cards.tsx     — stat cards with time range filter
    growth-indicator.tsx  — composite growth % card
    trend-charts.tsx      — line/area charts for metrics over time
    weekly-volume.tsx     — bar chart for weekly volume
    personal-records.tsx  — all-time bests display
    ride-table.tsx        — sortable/filterable ride history
  lib/
    peloton.ts            — Peloton API client (auth + fetch rides)
    supabase.ts           — Supabase client initialization
    queries.ts            — SQL aggregation helpers
    growth.ts             — growth indicator calculation logic
vercel.json               — cron job configuration
```

## Growth Indicator Details

The growth indicator compares the selected time window to the equivalent prior window:

- **This week** compares to last week
- **This month** compares to last month
- **This year** compares to last year
- **All time** — no comparison, indicator hidden

Input metrics (equally weighted to start, tunable later):

- Avg output per ride
- Avg heart rate efficiency (output / avg HR)
- Total rides
- Total duration
- Avg cadence
- Avg resistance

Formula: percentage change of each metric's value between the two periods, averaged together.

## Privacy / Security

- Single-user app, no auth system
- Peloton credentials stored only in Vercel environment variables, never exposed to the frontend
- App can be made private via Vercel's built-in password protection if desired

## Out of Scope (for now)

- Multi-user support / authentication
- Coaching, recommendations, or training plans
- Strava integration
- Mobile-specific layouts
- Heart rate zone breakdowns (could be added later)
- Detailed per-ride drill-down pages
