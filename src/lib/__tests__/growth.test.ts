import { calculateGrowth } from "@/lib/growth";
import type { SummaryStats } from "@/lib/types";

describe("calculateGrowth", () => {
  it("returns positive growth when current period is better", () => {
    const current: SummaryStats = {
      total_rides: 6,
      total_output: 1800,
      avg_output: 300,
      total_calories: 3000,
      total_distance: 60,
      total_duration_seconds: 10800,
      avg_heart_rate: 145,
    };
    const previous: SummaryStats = {
      total_rides: 5,
      total_output: 1400,
      avg_output: 280,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: 150,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeGreaterThan(0);
  });

  it("returns negative growth when current period is worse", () => {
    const current: SummaryStats = {
      total_rides: 3,
      total_output: 600,
      avg_output: 200,
      total_calories: 1200,
      total_distance: 25,
      total_duration_seconds: 5400,
      avg_heart_rate: 155,
    };
    const previous: SummaryStats = {
      total_rides: 6,
      total_output: 1800,
      avg_output: 300,
      total_calories: 3000,
      total_distance: 60,
      total_duration_seconds: 10800,
      avg_heart_rate: 145,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeLessThan(0);
  });

  it("returns null when previous period has no rides", () => {
    const current: SummaryStats = {
      total_rides: 5,
      total_output: 1500,
      avg_output: 300,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: 145,
    };
    const previous: SummaryStats = {
      total_rides: 0,
      total_output: 0,
      avg_output: 0,
      total_calories: 0,
      total_distance: 0,
      total_duration_seconds: 0,
      avg_heart_rate: null,
    };

    const result = calculateGrowth(current, previous);
    expect(result).toBeNull();
  });

  it("handles null heart rate gracefully", () => {
    const current: SummaryStats = {
      total_rides: 5,
      total_output: 1500,
      avg_output: 300,
      total_calories: 2500,
      total_distance: 50,
      total_duration_seconds: 9000,
      avg_heart_rate: null,
    };
    const previous: SummaryStats = {
      total_rides: 5,
      total_output: 1400,
      avg_output: 280,
      total_calories: 2300,
      total_distance: 48,
      total_duration_seconds: 9000,
      avg_heart_rate: null,
    };

    const result = calculateGrowth(current, previous);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("number");
  });
});
