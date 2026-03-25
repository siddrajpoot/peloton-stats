import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

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
