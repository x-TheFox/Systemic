"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Swords, Clock, Trophy, Check, X, Shield, Target } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Guild {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  totalXP?: number;
  adminId?: string;
  _count?: { members: number };
}

interface GuildDuel {
  id: string;
  status: string;
  weekNumber: number;
  year: number;
  challengerGuildId: string;
  opponentGuildId: string;
  challengerStartXP: number;
  opponentStartXP: number;
  challengerEndXP: number;
  opponentEndXP: number;
  winnerGuildId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  challengerGuild: Guild;
  opponentGuild: Guild;
}

function getGuildTotalXP(guildId: string, guilds: Guild[]) {
  const g = guilds.find((g) => g.id === guildId);
  return g?.totalXP ?? 0;
}

export default function GuildWarsPage() {
  const [duels, setDuels] = useState<GuildDuel[]>([]);
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [myGuildId, setMyGuildId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "past">("active");
  const [showChallenge, setShowChallenge] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [duelsRes, guildsRes, profileRes] = await Promise.all([
          fetch("/api/guild-duels"),
          fetch("/api/guilds"),
          fetch("/api/profile"),
        ]);

        if (duelsRes.ok) {
          const data = await duelsRes.json();
          setDuels(data.duels || []);
        }
        if (guildsRes.ok) {
          const data = await guildsRes.json();
          setGuilds(data.guilds || []);
        }
        if (profileRes.ok) {
          const data = await profileRes.json();
          const guild = data.user?.guild;
          setMyGuildId(guild?.id || null);
          setIsAdmin(guild?.admin?.id === data.user?.id);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function respondToDuel(duelId: string, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/guild-duels/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duelId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Guild war ${action}ed!`);
      const refresh = await fetch("/api/guild-duels");
      const data = await refresh.json();
      setDuels(data.duels || []);
    } catch {
      toast.error(`Failed to ${action} guild war.`);
    }
  }

  async function challengeGuild(opponentGuildId: string) {
    try {
      const res = await fetch("/api/guild-duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentGuildId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success("Guild war challenge sent!");
      setShowChallenge(false);
      const refresh = await fetch("/api/guild-duels");
      const data = await refresh.json();
      setDuels(data.duels || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to challenge guild.");
    }
  }

  const tabDuels = duels.filter((d) => {
    if (tab === "active") return d.status === "active" || d.status === "pending";
    return d.status === "completed" || d.status === "declined";
  });

  const yourDuels = tabDuels.filter(
    (d) => d.challengerGuildId === myGuildId || d.opponentGuildId === myGuildId
  );
  const otherDuels = tabDuels.filter(
    (d) => d.challengerGuildId !== myGuildId && d.opponentGuildId !== myGuildId
  );

  const challengeableGuilds = guilds.filter((g) => {
    if (g.id === myGuildId) return false;
    const hasActiveDuel = duels.some(
      (d) =>
        ((d.challengerGuildId === myGuildId && d.opponentGuildId === g.id) ||
          (d.opponentGuildId === myGuildId && d.challengerGuildId === g.id)) &&
        (d.status === "pending" || d.status === "active")
    );
    return !hasActiveDuel;
  });

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div
          variants={staggerItem}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-4">
            <Swords className="h-6 w-6 text-accent" />
            <h1 className="text-display gradient-text">Guild Wars</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => setShowChallenge(!showChallenge)}
                className="h-9 px-4 rounded-[var(--radius-compact)] bg-accent text-white text-sm font-semibold shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow inline-flex items-center gap-2"
              >
                <Target className="h-4 w-4" />
                Challenge
              </button>
            )}
            <p className="hidden sm:block text-sm text-fg-muted">
              Guild vs Guild weekly XP battles.
            </p>
          </div>
        </motion.div>

        {showChallenge && (
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
            <h2 className="text-heading text-white">Challenge a Guild</h2>
            {challengeableGuilds.length === 0 ? (
              <div className="text-center py-8 text-fg-muted">
                <Shield className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p>No guilds available to challenge.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {challengeableGuilds.map((guild) => (
                  <button
                    key={guild.id}
                    onClick={() => challengeGuild(guild.id)}
                    className="glass-card p-3 text-left hover:border-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-[var(--radius-compact)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center flex-shrink-0">
                        {guild.iconUrl ? (
                          <img
                            src={guild.iconUrl}
                            alt={guild.name}
                            className="h-full w-full object-contain p-1"
                          />
                        ) : (
                          <span className="text-sm font-bold text-accent">
                            {guild.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {guild.name}
                        </p>
                        <p className="text-xs text-fg-muted">
                          {(guild.totalXP || 0).toLocaleString()} XP
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}

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

        {/* Guild Wars */}
        <motion.div variants={staggerItem} className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-32 w-full rounded-[var(--radius-standard)]"
              />
            ))
          ) : (
            <>
              {/* Your Guild Wars */}
              {myGuildId && (
                <div className="space-y-4">
                  <div className="text-label text-fg-muted mb-2">
                    Your Guild Wars
                  </div>
                  {yourDuels.length === 0 ? (
                    <div className="text-center py-8 text-fg-muted">
                      <Swords className="h-6 w-6 mx-auto mb-2 opacity-50" />
                      <p>No {tab} guild wars.</p>
                    </div>
                  ) : (
                    yourDuels.map((duel) => (
                      <GuildWarCard
                        key={duel.id}
                        duel={duel}
                        myGuildId={myGuildId}
                        isAdmin={isAdmin}
                        guilds={guilds}
                        onRespond={respondToDuel}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Other Guild Wars */}
              <div className="space-y-4">
                <div className="text-label text-fg-muted mb-2">
                  Other Guild Wars
                </div>
                {otherDuels.length === 0 ? (
                  <div className="text-center py-8 text-fg-muted">
                    <Swords className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p>No {tab} guild wars.</p>
                  </div>
                ) : (
                  otherDuels.map((duel) => (
                    <GuildWarCard
                      key={duel.id}
                      duel={duel}
                      myGuildId={myGuildId}
                      isAdmin={isAdmin}
                      guilds={guilds}
                      onRespond={respondToDuel}
                    />
                  ))
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}

function GuildWarCard({
  duel,
  myGuildId,
  isAdmin,
  guilds,
  onRespond,
}: {
  duel: GuildDuel;
  myGuildId: string | null;
  isAdmin: boolean;
  guilds: Guild[];
  onRespond: (id: string, action: "accept" | "decline") => void;
}) {
  const isPending = duel.status === "pending";
  const isActive = duel.status === "active";
  const isCompleted = duel.status === "completed";
  const isDeclined = duel.status === "declined";

  const isMyGuildChallenger = myGuildId === duel.challengerGuildId;
  const isMyGuildOpponent = myGuildId === duel.opponentGuildId;
  const isOpponentAdmin = isMyGuildOpponent && isAdmin;

  const challengerGuild = duel.challengerGuild;
  const opponentGuild = duel.opponentGuild;

  const challengerCurrentXP = isActive
    ? getGuildTotalXP(duel.challengerGuildId, guilds)
    : isCompleted
    ? duel.challengerEndXP
    : getGuildTotalXP(duel.challengerGuildId, guilds);

  const opponentCurrentXP = isActive
    ? getGuildTotalXP(duel.opponentGuildId, guilds)
    : isCompleted
    ? duel.opponentEndXP
    : getGuildTotalXP(duel.opponentGuildId, guilds);

  const challengerGain =
    isActive || isCompleted
      ? challengerCurrentXP - duel.challengerStartXP
      : 0;
  const opponentGain =
    isActive || isCompleted
      ? opponentCurrentXP - duel.opponentStartXP
      : 0;

  const totalGain = Math.max(1, challengerGain + opponentGain);
  const challengerPct =
    totalGain > 0 ? (challengerGain / totalGain) * 100 : 50;
  const opponentPct =
    totalGain > 0 ? (opponentGain / totalGain) * 100 : 50;

  const winnerGuild =
    isCompleted && duel.winnerGuildId
      ? duel.winnerGuildId === duel.challengerGuildId
        ? challengerGuild
        : opponentGuild
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
            borderColor: isActive
              ? "rgba(139,92,246,0.3)"
              : isPending
              ? "rgba(255,255,255,0.1)"
              : isDeclined
              ? "rgba(239,68,68,0.3)"
              : "rgba(107,114,128,0.3)",
            color: isActive
              ? "#a78bfa"
              : isPending
              ? "#9ca3af"
              : isDeclined
              ? "#ef4444"
              : "#6b7280",
          }}
        >
          {duel.status}
        </span>
      </div>

      {/* VS Layout */}
      <div className="flex items-center gap-4">
        {/* Challenger */}
        <div className="flex-1 text-center">
          <div
            className={`h-14 w-14 mx-auto rounded-[var(--radius-standard)] overflow-hidden border-2 ${
              isMyGuildChallenger
                ? "border-accent ring-2 ring-accent/40 shadow-[0_0_10px_rgba(139,92,246,0.2)]"
                : "border-accent/40"
            } flex items-center justify-center bg-white/[0.03]`}
          >
            {challengerGuild.iconUrl ? (
              <img
                src={challengerGuild.iconUrl}
                alt={challengerGuild.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-lg font-bold text-accent">
                {(challengerGuild.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white mt-2 truncate">
            {challengerGuild.name}
          </p>
          {isMyGuildChallenger && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-bold text-accent uppercase tracking-wider">
              You
            </span>
          )}
          <p className="text-xs text-fg-muted">
            {isActive || isCompleted
              ? `+${challengerGain.toLocaleString()} XP`
              : `${challengerCurrentXP.toLocaleString()} XP`}
          </p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center gap-1">
          <div className="h-10 w-10 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
            <Swords className="h-5 w-5 text-accent" />
          </div>
          <span className="text-[10px] font-bold text-accent uppercase tracking-widest">
            VS
          </span>
        </div>

        {/* Opponent */}
        <div className="flex-1 text-center">
          <div
            className={`h-14 w-14 mx-auto rounded-[var(--radius-standard)] overflow-hidden border-2 ${
              isMyGuildOpponent
                ? "border-cyan-500 ring-2 ring-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "border-cyan-500/40"
            } flex items-center justify-center bg-white/[0.03]`}
          >
            {opponentGuild.iconUrl ? (
              <img
                src={opponentGuild.iconUrl}
                alt={opponentGuild.name}
                className="h-full w-full object-contain p-1"
              />
            ) : (
              <span className="text-lg font-bold text-cyan-400">
                {(opponentGuild.name || "?").charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-white mt-2 truncate">
            {opponentGuild.name}
          </p>
          {isMyGuildOpponent && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
              You
            </span>
          )}
          <p className="text-xs text-fg-muted">
            {isActive || isCompleted
              ? `+${opponentGain.toLocaleString()} XP`
              : `${opponentCurrentXP.toLocaleString()} XP`}
          </p>
        </div>
      </div>

      {/* XP Progress Bar */}
      {(isActive || isCompleted) && totalGain > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-fg-muted">
            <span
              className={
                challengerGain > opponentGain ? "text-accent font-bold" : ""
              }
            >
              {Math.round(challengerPct)}%
            </span>
            <span
              className={
                opponentGain > challengerGain ? "text-cyan-400 font-bold" : ""
              }
            >
              {Math.round(opponentPct)}%
            </span>
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
              ? `${challengerGuild.name} is ahead by ${(
                  challengerGain - opponentGain
                ).toLocaleString()} XP`
              : opponentGain > challengerGain
              ? `${opponentGuild.name} is ahead by ${(
                  opponentGain - challengerGain
                ).toLocaleString()} XP`
              : "Tied!"}
          </p>
        </div>
      )}

      {/* Pending actions */}
      {isPending && isOpponentAdmin && (
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
      {isCompleted && winnerGuild && (
        <div className="flex items-center justify-center gap-2 py-2 rounded-[var(--radius-compact)] bg-amber-500/5 border border-amber-500/20">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-bold text-amber-400">
            {winnerGuild.name} wins!
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
