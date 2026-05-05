"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface DayActivity {
  date: string;
  xpGained: number;
  platforms?: string[];
}

interface ContributionGraphProps {
  userId: string;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getColorClass(xp: number): string {
  if (xp === 0) return "bg-white/[0.03]";
  if (xp <= 50) return "bg-accent/20";
  if (xp <= 200) return "bg-accent/40";
  if (xp <= 500) return "bg-accent/60";
  return "bg-accent/90";
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ContributionGraph({ userId }: ContributionGraphProps) {
  const [activities, setActivities] = useState<DayActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    day: DayActivity | null;
  }>({ visible: false, x: 0, y: 0, day: null });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/streaks?userId=${userId}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) {
          setActivities(data.activities || []);
        }
      } catch {
        if (!cancelled) {
          setActivities([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const { weeks, monthLabels } = useMemo(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const endSaturday = new Date(today);
    endSaturday.setDate(today.getDate() + (6 - dayOfWeek));

    const startSunday = new Date(endSaturday);
    startSunday.setDate(endSaturday.getDate() - (52 * 7 + 6));

    const dateMap = new Map<string, DayActivity>();
    for (const a of activities) {
      dateMap.set(a.date, a);
    }

    const weeks: DayActivity[][] = [];
    const monthLabels: { index: number; label: string }[] = [];
    let prevMonth = -1;

    for (let w = 0; w < 53; w++) {
      const week: DayActivity[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startSunday);
        date.setDate(startSunday.getDate() + w * 7 + d);
        const dateStr = date.toISOString().split("T")[0];
        const activity = dateMap.get(dateStr);
        week.push({
          date: dateStr,
          xpGained: activity?.xpGained || 0,
          platforms: activity?.platforms,
        });
      }
      weeks.push(week);

      const firstDayOfWeek = new Date(startSunday);
      firstDayOfWeek.setDate(startSunday.getDate() + w * 7);
      const month = firstDayOfWeek.getMonth();
      if (month !== prevMonth) {
        monthLabels.push({ index: w, label: MONTHS[month] });
        prevMonth = month;
      }
    }

    return { weeks, monthLabels };
  }, [activities]);

  const handleMouseEnter = useCallback((day: DayActivity) => {
    setTooltip((prev) => ({ ...prev, visible: true, day }));
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltip((prev) => ({
      ...prev,
      x: e.clientX + 12,
      y: e.clientY - 12,
    }));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-label text-fg-dim">Activity Graph</span>
        </div>
        <div className="h-[120px] animate-pulse bg-white/[0.02] rounded-[var(--radius-standard)]" />
      </div>
    );
  }

  const totalXP = activities.reduce((sum, a) => sum + (a.xpGained || 0), 0);
  const activeDays = activities.filter((a) => (a.xpGained || 0) > 0).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent" />
          <span className="text-label text-fg-dim">Activity Graph</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-fg-muted">
          <span>{activeDays} active days</span>
          <span>{totalXP.toLocaleString()} XP</span>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm text-fg-muted">No activity recorded yet.</p>
          <p className="text-xs text-fg-dim mt-1">
            Sync your platforms to see your contribution graph.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto pb-2 relative"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Month labels */}
          <div className="flex gap-[3px] mb-1 pl-[26px]">
            {Array.from({ length: 53 }).map((_, wi) => {
              const label = monthLabels.find((m) => m.index === wi);
              return (
                <div key={wi} className="w-[10px] shrink-0">
                  {label && (
                    <span className="text-[10px] text-fg-muted font-medium whitespace-nowrap">
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* Day labels */}
            <div className="flex flex-col gap-[3px] mr-1 w-[22px]">
              {DAY_NAMES.map((day, i) => (
                <div key={i} className="h-[10px] flex items-center justify-end">
                  {i % 2 === 1 && (
                    <span className="text-[9px] text-fg-muted leading-none">
                      {day}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      delay: wi * 0.015 + di * 0.003,
                      duration: 0.25,
                      type: "spring",
                      stiffness: 400,
                      damping: 20,
                    }}
                    className={`h-[10px] w-[10px] rounded-sm ${getColorClass(
                      day.xpGained
                    )} hover:ring-1 hover:ring-white/40 cursor-pointer transition-colors`}
                    onMouseEnter={() => handleMouseEnter(day)}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-3 pl-[26px]">
            <span className="text-[10px] text-fg-muted">Less</span>
            <div className="flex gap-[3px]">
              <div className="h-[10px] w-[10px] rounded-sm bg-white/[0.03]" />
              <div className="h-[10px] w-[10px] rounded-sm bg-accent/20" />
              <div className="h-[10px] w-[10px] rounded-sm bg-accent/40" />
              <div className="h-[10px] w-[10px] rounded-sm bg-accent/60" />
              <div className="h-[10px] w-[10px] rounded-sm bg-accent/90" />
            </div>
            <span className="text-[10px] text-fg-muted">More</span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {tooltip.visible && tooltip.day && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] shadow-z-float text-xs space-y-0.5"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-medium text-white">{formatDate(tooltip.day.date)}</p>
          <p className="text-fg-dim">
            {tooltip.day.xpGained.toLocaleString()} XP
          </p>
          {tooltip.day.platforms && tooltip.day.platforms.length > 0 && (
            <p className="text-fg-muted">
              {tooltip.day.platforms.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
