"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Clock, Trophy, Check, X } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";

interface Duel {
  id: string;
  status: string;
  weekNumber: number;
  year: number;
  challenger: { name: string | null; email: string; githubHandle: string | null; imageUrl: string | null };
  opponent: { name: string | null; email: string; githubHandle: string | null; imageUrl: string | null };
  winnerId: string | null;
  createdAt: string;
}

export default function DuelsPage() {
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "pending" | "past">("active");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/duels");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setDuels(data.duels || []);
      } catch {
        setDuels([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function respondToDuel(duelId: string, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/duels/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duelId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Duel ${action}ed!`);
      // Refresh
      const refresh = await fetch("/api/duels");
      const data = await refresh.json();
      setDuels(data.duels || []);
    } catch {
      toast.error(`Failed to ${action} duel.`);
    }
  }

  const filtered = duels.filter((d) => {
    if (tab === "active") return d.status === "active";
    if (tab === "pending") return d.status === "pending";
    return d.status === "completed" || d.status === "declined";
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
          <Swords className="h-6 w-6 text-accent" />
          <h1 className="text-display gradient-text">Duels</h1>
          <p className="hidden sm:block text-sm text-fg-muted ml-auto">
            1v1 weekly XP battles.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={staggerItem} className="flex gap-2">
          {(["active", "pending", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold rounded-[var(--radius-compact)] border transition-colors capitalize ${
                tab === t
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "border-white/[0.06] text-fg-muted hover:text-fg-dim"
              }`}
            >
              {t}
            </button>
          ))}
        </motion.div>

        {/* Duels */}
        <motion.div variants={staggerItem} className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-[var(--radius-standard)]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-fg-muted">
              <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No {tab} duels.</p>
            </div>
          ) : (
            filtered.map((duel) => (
              <div
                key={duel.id}
                className="glass-card p-5 flex items-center gap-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-bold text-white">
                      {duel.challenger.name || duel.challenger.email.split("@")[0]}
                    </span>
                    <Swords className="h-3 w-3 text-fg-muted" />
                    <span className="text-sm font-bold text-white">
                      {duel.opponent.name || duel.opponent.email.split("@")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-fg-muted">
                    <Clock className="h-3 w-3" />
                    Week {duel.weekNumber}, {duel.year}
                    <span className="px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        borderColor: duel.status === "active" ? "rgba(139,92,246,0.3)" : duel.status === "pending" ? "rgba(255,255,255,0.1)" : "rgba(107,114,128,0.3)",
                        color: duel.status === "active" ? "#a78bfa" : duel.status === "pending" ? "#9ca3af" : "#6b7280",
                      }}
                    >
                      {duel.status}
                    </span>
                  </div>
                </div>

                {duel.status === "pending" && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondToDuel(duel.id, "accept")}
                      className="h-8 px-3 rounded-[var(--radius-compact)] bg-success/10 border border-success/30 text-success text-xs font-semibold hover:bg-success/20 transition-colors"
                    >
                      <Check className="h-3.5 w-3.5 inline mr-1" />
                      Accept
                    </button>
                    <button
                      onClick={() => respondToDuel(duel.id, "decline")}
                      className="h-8 px-3 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 inline mr-1" />
                      Decline
                    </button>
                  </div>
                )}

                {duel.status === "completed" && duel.winnerId && (
                  <div className="flex items-center gap-2 text-amber-400">
                    <Trophy className="h-4 w-4" />
                    <span className="text-xs font-bold">Winner!</span>
                  </div>
                )}
              </div>
            ))
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
