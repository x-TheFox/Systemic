"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Clock, Trophy, Check, X, Zap, TrendingUp } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser } from "@clerk/nextjs";

interface DuelPlayer {
  id: string;
  name: string | null;
  email: string;
  githubHandle: string | null;
  imageUrl: string | null;
  xp: number;
}

interface Duel {
  id: string;
  status: string;
  weekNumber: number;
  year: number;
  challengerStartXP: number;
  opponentStartXP: number;
  challengerEndXP: number;
  opponentEndXP: number;
  resolvedAt: string | null;
  challenger: DuelPlayer;
  opponent: DuelPlayer;
  winnerId: string | null;
  createdAt: string;
}

export default function DuelsPage() {
  const { user: clerkUser } = useUser();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");

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
          {(["active", "past"] as const).map((t) => (
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
        <motion.div variants={staggerItem} className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-[var(--radius-standard)]" />
            ))
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-fg-muted">
              <Swords className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No {tab} duels.</p>
            </div>
          ) : (
            filtered.map((duel) => (
              <DuelCard
                key={duel.id}
                duel={duel}
                currentUserId={clerkUser ? undefined : undefined}
                onRespond={respondToDuel}
              />
            ))
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}

function DuelCard({
  duel,
  onRespond,
}: {
  duel: Duel;
  currentUserId?: string;
  onRespond: (id: string, action: "accept" | "decline") => void;
}) {
  const isPending = duel.status === "pending";
  const isActive = duel.status === "active";
  const isCompleted = duel.status === "completed";

  const challengerGain = isActive || isCompleted
    ? duel.challenger.xp - duel.challengerStartXP
    : 0;
  const opponentGain = isActive || isCompleted
    ? duel.opponent.xp - duel.opponentStartXP
    : 0;
  const totalGain = Math.max(1, challengerGain + opponentGain);
  const challengerPct = totalGain > 0 ? (challengerGain / totalGain) * 100 : 50;
  const opponentPct = totalGain > 0 ? (opponentGain / totalGain) * 100 : 50;

  const winner = isCompleted && duel.winnerId
    ? duel.winnerId === duel.challenger.id ? duel.challenger : duel.opponent
    : null;
  const loser = isCompleted && duel.winnerId
    ? duel.winnerId === duel.challenger.id ? duel.opponent : duel.challenger
    : null;

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-fg-muted">
          <Clock className="h-3 w-3" />
          Week {duel.weekNumber}, {duel.year}
        </div>
        <span
          className="px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider"
          style={{
            borderColor: isActive ? "rgba(139,92,246,0.3)" : isPending ? "rgba(255,255,255,0.1)" : "rgba(107,114,128,0.3)",
            color: isActive ? "#a78bfa" : isPending ? "#9ca3af" : "#6b7280",
          }}
        >
          {duel.status}
        </span>
      </div>

      {/* VS Layout */}
      <div className="flex items-center gap-4">
        {/* Challenger */}
        <div className="flex-1 text-center">
          <Avatar className="h-14 w-14 mx-auto border-2 border-accent/40">
            <AvatarImage src={duel.challenger.imageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-lg font-bold">
              {(duel.challenger.name || duel.challenger.githubHandle || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-bold text-white mt-2 truncate">
            {duel.challenger.name || duel.challenger.githubHandle || "Anonymous"}
          </p>
          <p className="text-xs text-fg-muted">
            {isActive || isCompleted ? `+${challengerGain.toLocaleString()} XP` : `${duel.challenger.xp.toLocaleString()} XP`}
          </p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Swords className="h-5 w-5 text-accent" />
          </div>
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">VS</span>
        </div>

        {/* Opponent */}
        <div className="flex-1 text-center">
          <Avatar className="h-14 w-14 mx-auto border-2 border-cyan-500/40">
            <AvatarImage src={duel.opponent.imageUrl || undefined} />
            <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-accent text-white text-lg font-bold">
              {(duel.opponent.name || duel.opponent.githubHandle || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className="text-sm font-bold text-white mt-2 truncate">
            {duel.opponent.name || duel.opponent.githubHandle || "Anonymous"}
          </p>
          <p className="text-xs text-fg-muted">
            {isActive || isCompleted ? `+${opponentGain.toLocaleString()} XP` : `${duel.opponent.xp.toLocaleString()} XP`}
          </p>
        </div>
      </div>

      {/* XP Progress Bar (active only) */}
      {(isActive || isCompleted) && totalGain > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-fg-muted">
            <span className={challengerGain > opponentGain ? "text-accent font-bold" : ""}>{Math.round(challengerPct)}%</span>
            <span className={opponentGain > challengerGain ? "text-cyan-400 font-bold" : ""}>{Math.round(opponentPct)}%</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden bg-white/[0.04]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${challengerPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-accent to-purple-500"
            />
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${opponentPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-l from-cyan-500 to-blue-500"
            />
          </div>
          <p className="text-[10px] text-fg-muted text-center">
            {challengerGain > opponentGain
              ? `${duel.challenger.name || "Challenger"} is ahead by ${(challengerGain - opponentGain).toLocaleString()} XP`
              : opponentGain > challengerGain
              ? `${duel.opponent.name || "Opponent"} is ahead by ${(opponentGain - challengerGain).toLocaleString()} XP`
              : "Tied!"}
          </p>
        </div>
      )}

      {/* Pending actions */}
      {isPending && (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => onRespond(duel.id, "accept")}
            className="h-8 px-3 rounded-[var(--radius-compact)] bg-success/10 border border-success/30 text-success text-xs font-semibold hover:bg-success/20 transition-colors"
          >
            <Check className="h-3.5 w-3.5 inline mr-1" />
            Accept
          </button>
          <button
            onClick={() => onRespond(duel.id, "decline")}
            className="h-8 px-3 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
          >
            <X className="h-3.5 w-3.5 inline mr-1" />
            Decline
          </button>
        </div>
      )}

      {/* Completed winner */}
      {isCompleted && winner && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-[var(--radius-compact)] bg-amber-500/5 border border-amber-500/20">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">
            {winner.name || winner.githubHandle || "Winner"} wins!
          </span>
          <span className="text-[10px] text-fg-muted">
            +{Math.abs(challengerGain - opponentGain).toLocaleString()} XP gap
          </span>
        </div>
      )}

      {/* Resolved time */}
      {duel.resolvedAt && isActive && (
        <p className="text-[10px] text-fg-muted text-center">
          Resolves {new Date(duel.resolvedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
