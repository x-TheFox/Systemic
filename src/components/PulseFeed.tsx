"use client";

import { useEffect, useState, useRef } from "react";
import Pusher from "pusher-js";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Trophy, Unlock, Zap, Star, Clock } from "lucide-react";
import { pulseIn } from "@/lib/motion";

interface PulseEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
  xp?: number;
}

const eventConfig: Record<string, { icon: React.ReactNode; gradient: string; border: string; bg: string }> = {
  "rank-up": {
    icon: <Star className="h-3.5 w-3.5" />,
    gradient: "from-yellow-500/10 to-transparent",
    border: "border-l-yellow-500",
    bg: "bg-yellow-500/5",
  },
  "node-unlocked": {
    icon: <Unlock className="h-3.5 w-3.5" />,
    gradient: "from-accent/10 to-transparent",
    border: "border-l-accent",
    bg: "bg-accent/5",
  },
  "badge-earned": {
    icon: <Trophy className="h-3.5 w-3.5" />,
    gradient: "from-success/10 to-transparent",
    border: "border-l-success",
    bg: "bg-success/5",
  },
  "xp-milestone": {
    icon: <Zap className="h-3.5 w-3.5" />,
    gradient: "from-cyan-500/10 to-transparent",
    border: "border-l-cyan-500",
    bg: "bg-cyan-500/5",
  },
  "new-activity": {
    icon: <Activity className="h-3.5 w-3.5" />,
    gradient: "from-white/5 to-transparent",
    border: "border-l-white/20",
    bg: "bg-white/[0.02]",
  },
};

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function PulseFeed() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [userScrolled, setUserScrolled] = useState(false);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch("/api/pulse");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.events) setEvents(data.events);
      } catch (err) {
        console.error("Pulse history load error:", err);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!key) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
    });

    const channel = pusher.subscribe("systemics-activity");

    ["rank-up", "node-unlocked", "badge-earned", "xp-milestone", "new-activity"].forEach((type) => {
      channel.bind(type, (data: any) => {
        const event: PulseEvent = {
          id: Math.random().toString(36).slice(2),
          type,
          message: data.message || "New activity",
          timestamp: data.timestamp || new Date().toISOString(),
          userName: data.userName,
          xp: data.xp,
        };
        setEvents((prev) => [event, ...prev]);
      });
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, []);

  // Auto-scroll to top on new events unless user has manually scrolled down
  useEffect(() => {
    if (!userScrolled && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [events, userScrolled]);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    setUserScrolled(scrollTop > 10);
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-[var(--radius-standard)]" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative">
      <ScrollArea className="h-[300px] w-full" onScrollCapture={handleScroll}>
        <div ref={scrollRef} className="space-y-1.5 px-1">
          <AnimatePresence initial={false}>
            {events.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-56 text-fg-muted"
              >
                <Activity className="h-8 w-8 mb-2 animate-pulse" />
                <p className="text-sm">Waiting for gang activity...</p>
              </motion.div>
            ) : (
              events.map((e, i) => {
                const config = eventConfig[e.type] || eventConfig["new-activity"];
                const isNew = i === 0;
                return (
                  <motion.div
                    key={e.id}
                    variants={pulseIn}
                    initial="hidden"
                    animate="visible"
                    layout
                    className={`flex items-start gap-3 p-3 rounded-[var(--radius-standard)] bg-gradient-to-r ${config.gradient} border-l-2 ${config.border} ${isNew ? config.bg : ""} transition-colors hover:bg-white/[0.02]`}
                  >
                    <div className="mt-0.5 shrink-0 p-1.5 rounded-[var(--radius-compact)] bg-white/[0.04] text-fg-dim">
                      {config.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0 rounded text-fg-muted border border-white/[0.06]">
                          {e.type.replace("-", " ")}
                        </span>
                        {e.xp ? <span className="text-accent text-xs font-bold font-mono">+{e.xp} XP</span> : null}
                      </div>
                      <p className="text-sm text-fg-dim leading-snug">{e.message}</p>
                      <p className="text-[10px] text-fg-muted mt-1 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {relativeTime(e.timestamp)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
      {userScrolled && events.length > 0 && (
        <button
          onClick={() => {
            setUserScrolled(false);
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
          }}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider bg-surface border border-white/[0.08] text-fg-dim rounded-full shadow-z-float hover:text-white transition-colors"
        >
          New activity ↓
        </button>
      )}
    </div>
  );
}
