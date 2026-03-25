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
