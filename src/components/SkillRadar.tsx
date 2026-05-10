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

  if (loading) return <Skeleton className="w-full h-[280px] rounded-xl bg-[#18181b] border border-white/[0.04]" />;

  const mergedData = ghostMode && ghostData
    ? data.map((d) => {
        const ghostMatch = ghostData.find((g) => g.subject === d.subject);
        return { ...d, ghost: ghostMatch?.ghost };
      })
    : data;

  return (
    <motion.div variants={scaleInItem} initial="hidden" animate="visible" className="relative h-full flex flex-col min-h-[300px]">
      <div className="flex justify-end mb-3 absolute top-0 right-0 z-10 mx-1">
        <button
          onClick={() => setGhostMode(!ghostMode)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md border transition-all duration-200 ${
            ghostMode
              ? "bg-white/10 border-white/20 text-white shadow-sm"
              : "bg-[#18181b] border-white/[0.08] text-white/50 hover:text-white hover:border-white/15 hover:bg-[#1f1f23]"
          }`}
        >
          {ghostMode ? <Zap className="h-3 w-3 text-violet-400" /> : <Ghost className="h-3 w-3" />}
          {ghostMode ? "Ghost Active" : "Ghost Mode"}
        </button>
      </div>
      <div className="flex-1 mt-6">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={mergedData}>
            <defs>
              <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="ghostFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a1a1aa" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#a1a1aa" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <PolarGrid stroke="rgba(255,255,255,0.06)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 600, fontFamily: "var(--font-geist-sans)" }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar
              name="Current"
              dataKey="A"
              stroke="#8b5cf6"
              fill="url(#radarFill)"
              strokeWidth={2}
            />
            {ghostMode && ghostData && (
              <Radar
                name="Ghost"
                dataKey="ghost"
                stroke="rgba(255,255,255,0.2)"
                fill="url(#ghostFill)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
