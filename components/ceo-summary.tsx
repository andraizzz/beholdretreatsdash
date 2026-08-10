import { connection } from "next/server";
import {
  getGa4Rolling,
  getGa4Summary,
  isGa4Configured,
} from "@/lib/sources/ga4";
import {
  getTypeformRolling,
  getTypeformSources,
  isTypeformConfigured,
} from "@/lib/sources/typeform";
import {
  getSpendHistory,
  isSpendConfigured,
} from "@/lib/sources/spend";
import { buildAttributionComparison } from "@/lib/attribution-compare";
import { pickPositiveSignal, pickFixSignal } from "@/lib/signals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ROLLING_WEEKS = 5; // 1 current + 4 baseline

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctChange(current: number, baseline: number): number | null {
  if (baseline === 0) return current === 0 ? 0 : null;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

function DeltaLine({
  current,
  baseline,
  suffix = "",
  invert = false,
}: {
  current: number;
  baseline: number;
  suffix?: string;
  /** For metrics where "down" is good (e.g. cost). */
  invert?: boolean;
}) {
  const pct = pctChange(current, baseline);
  const rawUp = pct !== null && pct > 0;
  const rawDown = pct !== null && pct < 0;
  const good = invert ? rawDown : rawUp;
  const bad = invert ? rawUp : rawDown;
  return (
    <div
      className={cn(
        "text-xs mt-1",
        good && "text-emerald-600",
        bad && "text-red-600",
        !good && !bad && "text-muted-foreground",
      )}
    >
      {pct === null
        ? "no 4-week baseline yet"
        : `${rawUp ? "↑" : rawDown ? "↓" : ""} ${Math.abs(pct)}% vs. 4-week avg (${formatNumber(baseline)}${suffix})`}
    </div>
  );
}

function StatTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {children}
      </CardContent>
    </Card>
  );
}

function SignalTile({
  label,
  signal,
  emptyText,
  accent,
}: {
  label: string;
  signal: { headline: string; detail: string } | null;
  emptyText: string;
  accent: "positive" | "warn";
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle
          className={cn(
            "text-xs font-medium uppercase tracking-wide",
            accent === "positive" && "text-emerald-700",
            accent === "warn" && "text-amber-700",
          )}
        >
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {signal ? (
          <>
            <div className="text-sm font-semibold leading-tight">
              {signal.headline}
            </div>
            <div className="text-xs text-muted-foreground mt-1 leading-snug">
              {signal.detail}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        )}
      </CardContent>
    </Card>
  );
}

export async function CeoSummary() {
  await connection();

  if (!isGa4Configured()) return null;

  const [ga4Rolling, weekly, typeformRolling, typeformWeekly, spendHistory] =
    await Promise.all([
      getGa4Rolling(ROLLING_WEEKS),
      getGa4Summary(7),
      isTypeformConfigured()
        ? getTypeformRolling(ROLLING_WEEKS).catch(() => null)
        : Promise.resolve(null),
      isTypeformConfigured()
        ? getTypeformSources(7).catch(() => null)
        : Promise.resolve(null),
      isSpendConfigured()
        ? getSpendHistory(ROLLING_WEEKS).catch(() => null)
        : Promise.resolve(null),
    ]);

  const sessionsCurrent = ga4Rolling.sessionsByWeek[0];
  const sessionsBaseline = avg(ga4Rolling.sessionsByWeek.slice(1));

  const appsCurrent = typeformRolling?.countsByWeek[0] ?? null;
  const appsBaseline = typeformRolling
    ? avg(typeformRolling.countsByWeek.slice(1))
    : null;

  const conversionCurrent =
    appsCurrent !== null && sessionsCurrent > 0
      ? (appsCurrent / sessionsCurrent) * 100
      : null;
  const conversionBaseline =
    appsBaseline !== null && sessionsBaseline > 0
      ? (appsBaseline / sessionsBaseline) * 100
      : null;

  const attribution =
    typeformWeekly && weekly
      ? buildAttributionComparison(weekly.byChannel, typeformWeekly.rows)
      : null;

  const positiveSignal = pickPositiveSignal(ga4Rolling);
  const fixSignal = attribution
    ? pickFixSignal(ga4Rolling, attribution)
    : null;

  const currentSpend = spendHistory?.[0]?.total ?? null;
  const baselineSpend =
    spendHistory && spendHistory.length > 1
      ? avg(spendHistory.slice(1).map((s) => s.total))
      : null;
  const cpaCurrent =
    currentSpend !== null && appsCurrent !== null && appsCurrent > 0
      ? currentSpend / appsCurrent
      : null;
  const cpaBaseline =
    baselineSpend !== null && appsBaseline !== null && appsBaseline > 0
      ? baselineSpend / appsBaseline
      : null;

  const showCpa = isSpendConfigured();
  const gridCols = showCpa ? "lg:grid-cols-5" : "lg:grid-cols-4";

  return (
    <div className={cn("grid gap-4 grid-cols-2", gridCols)}>
      <StatTile
        label="Applications"
        value={appsCurrent !== null ? formatNumber(appsCurrent) : "—"}
      >
        {appsCurrent !== null && appsBaseline !== null && (
          <DeltaLine current={appsCurrent} baseline={appsBaseline} />
        )}
      </StatTile>

      <StatTile
        label="Sessions → application"
        value={
          conversionCurrent !== null ? `${conversionCurrent.toFixed(2)}%` : "—"
        }
      >
        {conversionCurrent !== null && conversionBaseline !== null && (
          <DeltaLine
            current={conversionCurrent}
            baseline={conversionBaseline}
            suffix="%"
          />
        )}
      </StatTile>

      {showCpa && (
        <StatTile
          label="Cost per application"
          value={cpaCurrent !== null ? `$${cpaCurrent.toFixed(0)}` : "—"}
        >
          {cpaCurrent !== null && cpaBaseline !== null ? (
            <DeltaLine
              current={cpaCurrent}
              baseline={cpaBaseline}
              suffix=""
              invert
            />
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              Log this week&apos;s spend below to compute
            </div>
          )}
        </StatTile>
      )}

      <SignalTile
        label="Biggest positive signal"
        signal={positiveSignal}
        emptyText="No standout channel movement this week"
        accent="positive"
      />

      <SignalTile
        label="Biggest thing to fix"
        signal={fixSignal}
        emptyText="Nothing sharp to fix — traffic and attribution look consistent"
        accent="warn"
      />
    </div>
  );
}
