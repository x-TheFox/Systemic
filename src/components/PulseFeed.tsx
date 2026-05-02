"use client";

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Trophy, Unlock, Zap, Star } from 'lucide-react';

interface PulseEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
  xp?: number;
}

const eventConfig: Record<string, { icon: React.ReactNode; gradient: string; border: string }> = {
  'rank-up': { icon: <Star className="h-3.5 w-3.5" />, gradient: 'from-yellow-500/10 to-transparent', border: 'border-l-yellow-500' },
  'node-unlocked': { icon: <Unlock className="h-3.5 w-3.5" />, gradient: 'from-purple-500/10 to-transparent', border: 'border-l-purple-500' },
  'achievement-earned': { icon: <Trophy className="h-3.5 w-3.5" />, gradient: 'from-green-500/10 to-transparent', border: 'border-l-green-500' },
  'xp-milestone': { icon: <Zap className="h-3.5 w-3.5" />, gradient: 'from-cyan-500/10 to-transparent', border: 'border-l-cyan-500' },
  'new-activity': { icon: <Activity className="h-3.5 w-3.5" />, gradient: 'from-white/5 to-transparent', border: 'border-l-white/20' },
};

export function PulseFeed() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Load historical feed on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/pulse?limit=30');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.events) setEvents(data.events);
      } catch (err) {
        console.error('Pulse history load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'ap2',
    });

    const channel = pusher.subscribe('systemics-activity');

    ['rank-up', 'node-unlocked', 'achievement-earned', 'xp-milestone', 'new-activity'].forEach(type => {
      channel.bind(type, (data: any) => {
        const event: PulseEvent = {
          id: Math.random().toString(36).slice(2),
          type,
          message: data.message || 'New activity',
          timestamp: data.timestamp || new Date().toISOString(),
          userName: data.userName,
          xp: data.xp,
        };
        setEvents(prev => [event, ...prev].slice(0, 50));
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] w-full">
      <div className="space-y-2 px-1">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-56 text-white/20">
            <Activity className="h-8 w-8 mb-2 animate-pulse" />
            <p className="text-sm">Waiting for gang activity...</p>
          </div>
        ) : (
          events.map(e => {
            const config = eventConfig[e.type] || eventConfig['new-activity'];
            return (
              <div
                key={e.id}
                className={`flex items-start gap-3 p-3 rounded-lg bg-gradient-to-r ${config.gradient} border-l-2 ${config.border} transition-all hover:bg-white/[0.02]`}
              >
                <div className="text-white/40 mt-0.5 shrink-0">{config.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[9px] py-0 border-white/10 text-white/40">{e.type.replace('-', ' ')}</Badge>
                    {e.xp ? <span className="text-purple-400 text-xs font-medium">+{e.xp} XP</span> : null}
                  </div>
                  <p className="text-sm text-white/70 leading-snug">{e.message}</p>
                  <p className="text-[10px] text-white/15 mt-1">{new Date(e.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </ScrollArea>
  );
}