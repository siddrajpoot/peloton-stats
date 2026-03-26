"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDuration, formatDate } from "@/lib/utils";
import type { PersonalRecord } from "@/lib/types";

interface PersonalRecordsProps {
  refreshKey: number;
}

export function PersonalRecords({ refreshKey }: PersonalRecordsProps) {
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/rides?view=records");
      setRecords(await res.json());
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-36" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="mt-1 h-3 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

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
                {formatDate(record.date)}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
