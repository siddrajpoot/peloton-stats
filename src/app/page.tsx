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
