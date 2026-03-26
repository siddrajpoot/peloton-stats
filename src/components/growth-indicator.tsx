import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GrowthIndicatorProps {
  percentage: number | null;
  timeRange: string;
}

export function GrowthIndicator({
  percentage,
  timeRange,
}: GrowthIndicatorProps) {
  if (percentage === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Growth
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-muted-foreground">—</p>
          <p className="text-xs text-muted-foreground">No prior data</p>
        </CardContent>
      </Card>
    );
  }

  const isPositive = percentage >= 0;
  const arrow = isPositive ? "↑" : "↓";
  const color = isPositive ? "text-emerald-300/70" : "text-red-600";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Growth
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-bold ${color}`}>
          {arrow} {isPositive ? "+" : ""}
          {percentage}%
        </p>
        <p className="text-xs text-muted-foreground">vs. previous {timeRange}</p>
      </CardContent>
    </Card>
  );
}
