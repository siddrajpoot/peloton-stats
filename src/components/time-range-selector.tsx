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
