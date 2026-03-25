import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fetchAllRides } from "@/lib/peloton";

// Allow up to 5 minutes for initial sync (many API calls)
export const maxDuration = 300;

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
