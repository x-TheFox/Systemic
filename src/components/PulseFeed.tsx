"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import Pusher from 'pusher-js';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Trophy, Unlock, Zap, Star, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cascadeVariants, fadeInUp, durations, easings } from '@/lib/motion';

interface PulseEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
  xp?: number;
}

const eventConfig: Record<string, {
  icon: React.ReactNode;
  borderColor: string;
  gradientFrom: string;
  textColor: string;
  glowClass: string;
}> = {
  'rank-up': {
    icon: <Star className="h-3.5 w-3.5" />,
    borderColor: 'var(--color-accent-achievement)',
    gradientFrom: 'var(--color-accent-achievement-dim)',
    textColor: 'var(--color-accent-achievement)',
    glowClass: 'glow-achievement',
  },
  'node-unlocked': {
    icon: <Unlock className="h-3.5 w-3.5" />,
    borderColor: 'var(--color-accent-success)',
    gradientFrom: 'var(--color-accent-success-dim)',
    textColor: 'var(--color-accent-success)',
    glowClass: 'glow-success',
  },
  'achievement-earned': {
    icon: <Trophy className="h-3.5 w-3.5" />,
    borderColor: 'var(--color-accent-primary)',
    gradientFrom: 'var(--color-accent-primary-dim)',
    textColor: 'var(--color-accent-primary)',
    glowClass: 'glow-primary',
  },
  'xp-milestone': {
    icon: <Zap className="h-3.5 w-3.5" />,
    borderColor: 'var(--color-accent-tertiary)',
    gradientFrom: 'var(--color-accent-tertiary-dim)',
    textColor: 'var(--color-accent-tertiary)',
    glowClass: 'glow-tertiary',
  },
  'new-activity': {
    icon: <Activity className="h-3.5 w-3.5" />,
    borderColor: 'var(--color-text-muted)',
    gradientFrom: 'var(--color-border-subtle)',
    textColor: 'var(--color-text-muted)',
    glowClass: '',
  },
};

export function PulseFeed() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasNewEvents, setHasNewEvents] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtTopRef = useRef(true);

  const checkIfAtTop = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop } = scrollRef.current;
      isAtTopRef.current = scrollTop < 20;
      if (isAtTopRef.current) {
        setHasNewEvents(false);
      }
    }
  }, []);

  // Load historical feed on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch('/api/pulse');
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
        setEvents(prev => [event, ...prev]);

        // If user has scrolled down, show the "New events" pill
        if (!isAtTopRef.current) {
          setHasNewEvents(true);
        }
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  const scrollToTop = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
      setHasNewEvents(false);
    }
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
    <motion.div
      variants={cascadeVariants}
      initial="hidden"
      animate="visible"
      custom={0}
      className="prismatic-card p-5"
    >
      {/* Section header with achievement strip */}
      <div className="section-strip-achievement mb-4 pt-3">
        <div className="flex items-center gap-2">
          <Activity
            className="h-4 w-4"
            style={{ color: 'var(--color-accent-achievement)' }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Pulse Feed
          </h3>
        </div>
      </div>

      {/* Scrollable feed with "New events" indicator */}
      <div className="relative">
        <ScrollArea className="h-[300px] w-full">
          <div
            ref={scrollRef}
            onScroll={checkIfAtTop}
            className="space-y-2 px-1"
          >
            <AnimatePresence mode="popLayout">
              {events.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-56"
                  style={{ color: 'var(--color-text-dim)' }}
                >
                  <Activity className="h-8 w-8 mb-2 animate-pulse" />
                  <p className="text-sm">Waiting for gang activity...</p>
                </motion.div>
              ) : (
                events.map((e, index) => {
                  const config = eventConfig[e.type] || eventConfig['new-activity'];
                  return (
                    <motion.div
                      key={e.id}
                      variants={fadeInUp}
                      initial="hidden"
                      animate="visible"
                      custom={index * 0.03}
                      className="flex items-start gap-3 p-3 rounded-lg transition-all hover:brightness-110"
                      style={{
                        background: `linear-gradient(to right, ${config.gradientFrom}, transparent)`,
                        borderLeft: `2px solid ${config.borderColor}`,
                      }}
                    >
                      <div className="mt-0.5 shrink-0" style={{ color: config.textColor }}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 font-medium"
                            style={{
                              borderColor: config.borderColor,
                              color: config.textColor,
                              background: config.gradientFrom,
                            }}
                          >
                            {e.type.replace('-', ' ')}
                          </Badge>
                          {e.xp ? (
                            <span
                              className="text-xs font-medium stat-value"
                              style={{ color: 'var(--color-accent-tertiary)' }}
                            >
                              +{e.xp} XP
                            </span>
                          ) : null}
                        </div>
                        <p
                          className="text-sm leading-snug"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {e.message}
                        </p>
                        <p
                          className="text-[10px] mt-1"
                          style={{ color: 'var(--color-text-dim)' }}
                        >
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* New events pill */}
        <AnimatePresence>
          {hasNewEvents && (
            <motion.button
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={{ duration: durations.fast, ease: easings.bounce }}
              onClick={scrollToTop}
              className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold z-10 cursor-pointer backdrop-blur-md"
              style={{
                background: 'var(--color-accent-achievement)',
                color: 'var(--color-base)',
                boxShadow: '0 0 16px var(--color-accent-achievement-glow)',
              }}
            >
              <ChevronUp className="h-3 w-3" />
              New events
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
