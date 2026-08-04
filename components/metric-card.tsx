import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: string | number;
  delta?: { value: number; label?: string };
  hint?: string;
};

export function MetricCard({ label, value, delta, hint }: Props) {
  const up = delta && delta.value > 0;
  const down = delta && delta.value < 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-3">
          <div className="text-3xl font-semibold tracking-tight">{value}</div>
          {delta && (
            <div
              className={cn(
                "text-sm font-medium",
                up && "text-emerald-600",
                down && "text-red-600",
                !up && !down && "text-muted-foreground",
              )}
            >
              {up && "↑"} {down && "↓"} {Math.abs(delta.value)}%
              {delta.label && (
                <span className="ml-1 text-muted-foreground font-normal">
                  {delta.label}
                </span>
              )}
            </div>
          )}
        </div>
        {hint && (
          <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
        )}
      </CardContent>
    </Card>
  );
}
