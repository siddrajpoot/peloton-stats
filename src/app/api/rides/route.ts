import { NextRequest, NextResponse } from "next/server";
import {
  getRides,
  getSummaryStats,
  getPersonalRecords,
  getAggregatedRides,
  getLastSyncTime,
} from "@/lib/queries";

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
