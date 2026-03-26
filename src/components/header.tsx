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
        <h1 className="text-2xl font-bold"><span className="text-primary">Peloton</span> Stats</h1>
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
