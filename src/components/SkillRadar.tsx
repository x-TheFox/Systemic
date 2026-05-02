"use client";

import { useEffect, useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Ghost } from 'lucide-react';

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
  const [ghostMode, setGhostMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/radar');
        if (!res.ok) throw new Error('Failed');
        const d = await res.json();
        if (d.radar && d.radar.length > 0) setData(d.radar);
      } catch {
        // Keep defaults
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <Skeleton className="w-full h-[300px] rounded-xl" />;

  return (
    <div>
      <div className="flex justify-end mb-2">
        <Button
          variant={ghostMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGhostMode(!ghostMode)}
          className={`gap-2 text-xs ${ghostMode ? 'bg-gradient-to-r from-gray-600 to-gray-700 border-0' : 'border-white/10 hover:bg-white/5'}`}
        >
          <Ghost className="h-3.5 w-3.5" />
          {ghostMode ? 'Ghost On' : 'Ghost Mode'}
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.06)" />
          <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
          <Radar
            name="Current"
            dataKey="A"
            stroke="#a855f7"
            fill="#a855f7"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          {ghostMode && data.some(d => d.ghost !== undefined) && (
            <Radar
              name="Ghost"
              dataKey="ghost"
              stroke="#6b7280"
              fill="#6b7280"
              fillOpacity={0.1}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}