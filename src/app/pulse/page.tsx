"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Trophy, Zap, Filter, Search } from "lucide-react";
import { pageEntrance, staggerItem, pulseIn } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

interface PulseEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  userName?: string;
  xp?: number;
  rarity?: string;
}

const eventConfig: Record<string, { color: string; bg: string }> = {
  "rank-up": { color: "text-yellow-400", bg: "bg-yellow-500/5" },
  "node-unlocked": { color: "text-accent", bg: "bg-accent/5" },
  "badge-earned": { color: "text-success", bg: "bg-success/5" },
  "xp-milestone": { color: "text-cyan-400", bg: "bg-cyan-500/5" },
  "new-activity": { color: "text-fg-dim", bg: "bg-white/[0.02]" },
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

export default function PulsePage() {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pulse");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setEvents(data.events || []);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = events.filter((e) => {
    if (filter !== "all" && e.type !== filter) return false;
    if (search && !e.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <Activity className="h-6 w-6 text-cyan-400" />
          <h1 className="text-display gradient-text">The Pulse</h1>
          <p className="hidden sm:block text-sm text-fg-muted ml-auto">
            Real-time gang activity.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div variants={staggerItem} className="flex flex-wrap gap-2">
          {["all", "badge-earned", "node-unlocked", "xp-milestone", "new-activity"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                filter === f
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "border-white/[0.06] text-fg-muted hover:text-fg-dim hover:border-white/[0.12]"
              }`}
            >
              {f === "all" ? "All" : f.replace("-", " ")}
            </button>
          ))}
          <div className="relative ml-auto">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-fg-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 pl-8 pr-3 rounded-full bg-white/[0.03] border border-white/[0.06] text-sm text-white placeholder:text-fg-muted focus:outline-none focus:border-accent/30 transition-colors"
            />
          </div>
        </motion.div>

        {/* Events */}
        <motion.div variants={staggerItem} className="space-y-2">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-standard)]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-fg-muted">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No activity matching your filters.</p>
            </div>
          ) : (
            filtered.map((e) => {
              const cfg = eventConfig[e.type] || eventConfig["new-activity"];
              return (
                <motion.div
                  key={e.id}
                  variants={pulseIn}
                  className={`flex items-start gap-3 p-4 rounded-[var(--radius-standard)] ${cfg.bg} border border-white/[0.04] transition-colors hover:bg-white/[0.02]`}
                >
                  <div className="mt-0.5 shrink-0">
                    {e.type === "badge-earned" && e.rarity && (
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          background:
                            e.rarity === "legendary"
                              ? "#f59e0b"
                              : e.rarity === "epic"
                              ? "#a855f7"
                              : e.rarity === "rare"
                              ? "#3b82f6"
                              : "#6b7280",
                          boxShadow: `0 0 6px ${
                            e.rarity === "legendary"
                              ? "#f59e0b"
                              : e.rarity === "epic"
                              ? "#a855f7"
                              : e.rarity === "rare"
                              ? "#3b82f6"
                              : "#6b7280"
                          }`,
                        }}
                      />
                    )}
                    {e.type !== "badge-earned" && (
                      <Zap className={`h-4 w-4 ${cfg.color}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-fg-dim leading-snug">{e.message}</p>
                    <p className="text-[10px] text-fg-muted mt-1">{relativeTime(e.timestamp)}</p>
                  </div>
                  {e.xp ? (
                    <span className="text-xs font-bold font-mono text-accent">+{e.xp} XP</span>
                  ) : null}
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
