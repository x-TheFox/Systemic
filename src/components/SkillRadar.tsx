"use client";

import { useState, useEffect } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface SkillData {
  subject: string;
  A: number;
  fullMark: number;
}

interface GhostData {
  subject: string;
  A: number;
  ghost: number;
  fullMark: number;
}

export function SkillRadar() {
  const [data, setData] = useState<SkillData[]>([]);
  const [ghostData, setGhostData] = useState<GhostData[]>([]);
  const [ghostMode, setGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRadar() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load');
        const profile = await res.json();

        // Calculate skill breakdown from activity logs
        const categories: Record<string, number> = { Frontend: 0, Backend: 0, DevOps: 0, Architecture: 0, Algo: 0 };
        profile.user?.activityLogs?.forEach((log: any) => {
          const cat = log.metadata?.category || 'Algo';
          if (categories[cat] !== undefined) categories[cat] += log.xpAwarded;
        });

        const maxValue = Math.max(...Object.values(categories), 1);
        const normalized = Object.entries(categories).map(([subject, value]) => ({
          subject,
          A: Math.round((value / maxValue) * 150),
          fullMark: 150,
        }));

        setData(normalized);

        // Load ghost snapshot
        const ghostRes = await fetch(`/api/ghost?userId=${profile.user.id}`);
        if (ghostRes.ok) {
          const ghost = await ghostRes.json();
          const latestGhost = ghost.snapshots?.[0];
          if (latestGhost) {
            const ghostBreakdown = latestGhost.skillBreakdown as Record<string, number>;
            const ghostMax = Math.max(...Object.values(ghostBreakdown), 1);
            const combined = Object.entries(categories).map(([subject, value]) => ({
              subject,
              A: Math.round((value / maxValue) * 150),
              ghost: Math.round(((ghostBreakdown[subject] || 0) / ghostMax) * 150),
              fullMark: 150,
            }));
            setGhostData(combined);
          }
        }
      } catch {
        setData([
          { subject: 'Frontend', A: 80, fullMark: 150 },
          { subject: 'Backend', A: 90, fullMark: 150 },
          { subject: 'DevOps', A: 60, fullMark: 150 },
          { subject: 'Architecture', A: 70, fullMark: 150 },
          { subject: 'Algo', A: 100, fullMark: 150 },
        ]);
      } finally {
        setLoading(false);
      }
    }

    loadRadar();
  }, []);

  if (loading) {
    return <Skeleton className="w-full h-[300px] rounded-xl" />;
  }

  const chartData = ghostMode && ghostData.length > 0 ? ghostData : data;

  return (
    <div className="w-full">
      <div className="flex justify-end mb-2">
        <Button
          variant={ghostMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGhostMode(!ghostMode)}
          className="text-xs"
        >
          {ghostMode ? 'Hide Ghost' : 'Toggle Ghost Mode'}
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={{ fill: '#6b7280', fontSize: 10 }} />
          <Radar
            name="Current"
            dataKey="A"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.4}
          />
          {ghostMode && ghostData.length > 0 && (
            <Radar
              name="Ghost (Last Week)"
              dataKey="ghost"
              stroke="#6b7280"
              fill="#6b7280"
              fillOpacity={0.2}
              strokeDasharray="4 4"
            />
          )}
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
