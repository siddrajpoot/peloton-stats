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
