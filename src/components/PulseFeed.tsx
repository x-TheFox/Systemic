"use client";

import { useEffect, useState } from 'react';
import Pusher from 'pusher-js';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PulseEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
  xp?: number;
}

const eventColors: Record<string, string> = {
  'rank-up': 'border-yellow-500 bg-yellow-500/10',
  'node-unlocked': 'border-purple-500 bg-purple-500/10',
  'achievement-earned': 'border-green-500 bg-green-500/10',
  'xp-milestone': 'border-blue-500 bg-blue-500/10',
  'new-activity': 'border-gray-500 bg-gray-500/10',
};

const eventIcons: Record<string, string> = {
  'rank-up': '🔥',
  'node-unlocked': '🔓',
  'achievement-earned': '🏆',
  'xp-milestone': '⚡',
  'new-activity': '📡',
};

export function PulseFeed() {
  const [events, setEvents] = useState<PulseEvent[]>([]);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return;

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2',
    });

    const channel = pusher.subscribe('systemics-activity');
    
    const eventTypes = ['rank-up', 'node-unlocked', 'achievement-earned', 'xp-milestone', 'new-activity'];
    
    eventTypes.forEach((type) => {
      channel.bind(type, (data: any) => {
        const event: PulseEvent = {
          id: Math.random().toString(36).slice(2),
          type,
          message: data.message || 'New activity',
          timestamp: data.timestamp || new Date().toISOString(),
          userName: data.userName,
          xp: data.xp,
        };
        setEvents((prev) => [event, ...prev].slice(0, 50));
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  return (
    <ScrollArea className="h-[300px] w-full">
      <div className="space-y-3 px-4">
        {events.length === 0 ? (
          <div className="text-gray-500 text-center mt-10 text-sm">
            Waiting for gang activity...
          </div>
        ) : (
          events.map((e) => (
            <div
              key={e.id}
              className={`p-3 rounded-lg text-sm border-l-4 ${eventColors[e.type] || 'border-gray-500 bg-gray-800'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{eventIcons[e.type] || '•'}</span>
                <Badge variant="outline" className="text-[10px]">
                  {e.type.replace('-', ' ')}
                </Badge>
                {e.xp && <span className="text-purple-400 text-xs">+{e.xp} XP</span>}
              </div>
              <p className="text-gray-300">{e.message}</p>
              <p className="text-gray-600 text-[10px] mt-1">
                {new Date(e.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
