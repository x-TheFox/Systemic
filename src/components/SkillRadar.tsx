"use client";

import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Ghost } from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { cascadeVariants, fadeInUp } from '@/lib/motion';

interface SkillData {
  subject: string;
  A: number;
  ghost?: number;
  fullMark: number;
}

const defaultData: SkillData[] = [
  { subject: 'Frontend', A: 50, fullMark: 150 },
  { subject: 'Backend', A: 50, fullMark: 150 },
  { subject: 'DevOps', A: 50, fullMark: 150 },
  { subject: 'Architecture', A: 50, fullMark: 150 },
  { subject: 'Algo', A: 50, fullMark: 150 },
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
        if (!res.ok) throw new Error('Failed');
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

  if (loading) return <Skeleton className="w-full h-[300px] rounded-xl" />;

  const mergedData = ghostMode && ghostData
    ? data.map((d) => {
        const ghostMatch = ghostData.find((g) => g.subject === d.subject);
        return { ...d, ghost: ghostMatch?.ghost };
      })
    : data;

  return (
    <motion.div
      variants={cascadeVariants}
      initial="hidden"
      animate="visible"
      custom={0}
      className="prismatic-card ambient-cyan p-5"
    >
      {/* Section header with tertiary strip */}
      <div className="section-strip-tertiary mb-4 pt-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Skill Radar
          </h3>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
          >
            <Button
              variant={ghostMode ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGhostMode(!ghostMode)}
              className={`gap-2 text-xs transition-all ${
                ghostMode
                  ? 'border-0 text-white'
                  : 'border-[var(--color-border-default)] hover:bg-[var(--color-accent-secondary-dim)]'
              }`}
              style={
                ghostMode
                  ? {
                      background: `linear-gradient(135deg, var(--color-accent-secondary), rgba(168, 85, 247, 0.7))`,
                      boxShadow: `0 0 16px var(--color-accent-secondary-glow)`,
                    }
                  : { color: 'var(--color-text-muted)' }
              }
            >
              <Ghost className="h-3.5 w-3.5" />
              {ghostMode ? 'Ghost On' : 'Ghost Mode'}
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Radar Chart */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        custom={0.15}
      >
        <ResponsiveContainer width="100%" height={280}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={mergedData}>
            <PolarGrid stroke="var(--color-border-default)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{
                fill: 'var(--color-text-muted)',
                fontSize: 11,
              }}
            />
            <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
            <Radar
              name="Current"
              dataKey="A"
              stroke="var(--color-accent-primary)"
              fill="var(--color-accent-primary)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            {ghostMode && ghostData && (
              <Radar
                name="Ghost"
                dataKey="ghost"
                stroke="var(--color-accent-secondary)"
                fill="var(--color-accent-secondary)"
                fillOpacity={0.1}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </motion.div>
    </motion.div>
  );
}
