"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface Activity {
  date: string;
  xpGained: number;
}

export function StreakHeatmap({ handle }: { handle: string }) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/streaks?handle=${handle}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setActivities(data.activities || []);
        setStreak(data.streak || 0);
      } catch {
        setActivities([]);
        setStreak(0);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [handle]);

  if (loading) {
    return <div className="h-32 animate-pulse bg-white/[0.02] rounded-[var(--radius-standard)]" />;
  }

  // Generate 52 weeks of data
  const weeks: Activity[][] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (6 - dayOfWeek)); // End on Saturday

  const dateMap = new Map(activities.map((a) => [a.date, a.xpGained]));

  for (let w = 0; w < 52; w++) {
    const week: Activity[] = [];
    for (let d = 6; d >= 0; d--) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - (w * 7 + d));
      const dateStr = date.toISOString().split("T")[0];
      week.push({
        date: dateStr,
        xpGained: dateMap.get(dateStr) || 0,
      });
    }
    weeks.push(week);
  }

  const getColor = (xp: number) => {
    if (xp === 0) return "rgba(255,255,255,0.03)";
    if (xp < 50) return "rgba(139,92,246,0.25)";
    if (xp < 150) return "rgba(139,92,246,0.5)";
    if (xp < 300) return "rgba(139,92,246,0.75)";
    return "rgba(139,92,246,1)";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400" />
          <span className="text-label text-fg-dim">Contribution Heatmap</span>
        </div>
        {streak > 0 && (
          <span className="text-xs font-bold font-mono text-orange-400">
            {streak}-day streak
          </span>
        )}
      </div>
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-[3px]">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${day.date}: ${day.xpGained} XP`}
                className="h-[10px] w-[10px] rounded-sm transition-colors hover:ring-1 hover:ring-white/30"
                style={{ backgroundColor: getColor(day.xpGained) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
