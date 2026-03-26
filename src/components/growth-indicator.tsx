import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { GROWTH_DESCRIPTION } from "@/lib/growth";

interface GrowthIndicatorProps {
  percentage: number | null;
  timeRange: string;
}

function GrowthTitle() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <CardTitle className="text-sm font-medium text-muted-foreground cursor-help inline-flex items-center gap-1">
            Growth
            <span className="text-xs opacity-50">ⓘ</span>
          </CardTitle>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {GROWTH_DESCRIPTION}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function GrowthIndicator({
  percentage,
  timeRange,
}: GrowthIndicatorProps) {
  if (percentage === null) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <GrowthTitle />
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
        <GrowthTitle />
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
