"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { Ghost, Zap } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { scaleInItem } from "@/lib/motion";

interface SkillData {
  subject: string;
  A: number;
  ghost?: number;
  fullMark: number;
}

const defaultData: SkillData[] = [
  { subject: "Frontend", A: 50, fullMark: 150 },
  { subject: "Backend", A: 50, fullMark: 150 },
  { subject: "DevOps", A: 50, fullMark: 150 },
  { subject: "Architecture", A: 50, fullMark: 150 },
  { subject: "Algo", A: 50, fullMark: 150 },
];

export function SkillRadar() {
  const [data, setData] = useState<SkillData[]>(defaultData);
  const [ghostData, setGhostData] = useState<SkillData[] | null>(null);
  const [ghostMode, setGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) return;
    async function load() {
      try {
        const clerkId = user?.id;
        if (!clerkId) {
          setLoading(false);
          return;
        }
        const res = await fetch(`/api/radar?clerkId=${clerkId}&ghost=true`);
        if (!res.ok) throw new Error("Failed");
        const d = await res.json();
        if (d.radar && d.radar.length > 0) setData(d.radar);
        if (d.ghost && d.ghost.length > 0) {
          setGhostData(d.ghost);
        }
      } catch {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [isLoaded, user]);

  if (loading) return <Skeleton className="w-full h-[300px] rounded-[var(--radius-standard)]" />;

  const mergedData = ghostMode && ghostData
    ? data.map((d) => {
        const ghostMatch = ghostData.find((g) => g.subject === d.subject);
        return { ...d, ghost: ghostMatch?.ghost };
      })
    : data;

  return (
    <motion.div variants={scaleInItem} initial="hidden" animate="visible">
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setGhostMode(!ghostMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[var(--radius-compact)] border transition-all duration-200 ${
            ghostMode
              ? "bg-fg-muted/20 border-fg-muted/30 text-white shadow-[0_0_16px_rgba(255,255,255,0.1)]"
              : "bg-transparent border-white/[0.08] text-fg-muted hover:text-white hover:border-white/15"
          }`}
        >
          {ghostMode ? <Zap className="h-3.5 w-3.5 text-accent" /> : <Ghost className="h-3.5 w-3.5" />}
          {ghostMode ? "Ghost Active" : "Ghost Mode"}
        </button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={mergedData}>
          <defs>
            <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="ghostFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted-fg))" stopOpacity={0.15} />
              <stop offset="100%" stopColor="hsl(var(--muted-fg))" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: "hsl(var(--fg-dim))", fontSize: 11, fontFamily: "var(--font-geist-sans)" }}
          />
          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
          <Radar
            name="Current"
            dataKey="A"
            stroke="hsl(var(--accent))"
            fill="url(#radarFill)"
            strokeWidth={2}
          />
          {ghostMode && ghostData && (
            <Radar
              name="Ghost"
              dataKey="ghost"
              stroke="hsl(var(--muted-fg))"
              fill="url(#ghostFill)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}
