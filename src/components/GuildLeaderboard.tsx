"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Trophy, Users, Crown, Swords } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";

interface GuildLeaderboardItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  memberCount: number;
  totalXP: number;
  admin: {
    id: string;
    name: string | null;
    githubHandle: string | null;
    imageUrl: string | null;
  } | null;
  topMember: {
    id: string;
    name: string | null;
    githubHandle: string | null;
    xp: number;
  } | null;
}

export function GuildLeaderboard() {
  const { user: clerkUser } = useUser();
  const [guilds, setGuilds] = useState<GuildLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [myGuildId, setMyGuildId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildsRes, profileRes] = await Promise.all([
          fetch("/api/leaderboard?type=guilds&limit=50"),
          fetch("/api/profile"),
        ]);
        if (guildsRes.ok) {
          const data = await guildsRes.json();
          setGuilds(data.guilds || []);
        }
        if (profileRes.ok) {
          const data = await profileRes.json();
          setMyGuildId(data.user?.guildId || null);
          setMyUserId(data.user?.id || null);
        }
      } catch {
        setGuilds([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function challengeGuild(opponentGuildId: string) {
    try {
      const res = await fetch("/api/guild-duels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentGuildId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to challenge");
        return;
      }
      toast.success("Guild duel challenge sent!");
    } catch {
      toast.error("Failed to send challenge.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[var(--radius-standard)]" />
        ))}
      </div>
    );
  }

  if (guilds.length === 0) {
    return (
      <div className="text-center py-16 text-fg-muted">
        <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No guilds yet. Be the first to create one!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {guilds.map((guild, i) => (
        <motion.div
          key={guild.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03 }}
          className="flex items-center gap-4 p-4 rounded-[var(--radius-standard)] bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.10] hover:bg-white/[0.03] transition-all"
        >
          {/* Rank */}
          <span className="text-xs font-mono font-bold text-fg-muted w-6 text-center">
            {i + 1}
          </span>

          {/* Big Guild Icon */}
          <div className="flex-shrink-0">
            {guild.iconUrl ? (
              <div className="h-14 w-14 rounded-[var(--radius-compact)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-contain p-1" />
              </div>
            ) : (
              <div className="h-14 w-14 rounded-[var(--radius-compact)] bg-gradient-to-br from-accent/20 to-cyan-500/20 border border-accent/30 flex items-center justify-center">
                <span className="text-xl font-bold text-accent">{guild.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
          </div>

          {/* Guild Info */}
          <div className="flex-1 min-w-0">
            <Link href={`/guilds/${guild.slug}`}>
              <h3 className="text-sm font-bold text-white hover:text-accent transition-colors truncate">
                {guild.name}
              </h3>
            </Link>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {guild.admin && (
                <span className="inline-flex items-center gap-1 text-[11px] text-fg-dim">
                  <Crown className="h-3 w-3 text-amber-400" />
                  {guild.admin.name || guild.admin.githubHandle || "Unknown"}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] text-fg-dim">
                <Users className="h-3 w-3" />
                {guild.memberCount}
              </span>
            </div>
          </div>

          {/* XP */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-bold font-mono text-white">
              {guild.totalXP.toLocaleString()}
            </div>
            <div className="text-[10px] text-accent font-medium">XP</div>
          </div>

          {/* Challenge button */}
          {myGuildId && myGuildId !== guild.id && (
            <button
              onClick={() => challengeGuild(guild.id)}
              className="flex-shrink-0 h-8 px-2.5 rounded-[var(--radius-compact)] bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors inline-flex items-center gap-1"
              title="Challenge this guild to a duel"
            >
              <Swords className="h-3 w-3" />
              <span className="hidden sm:inline">Duel</span>
            </button>
          )}
        </motion.div>
      ))}
    </div>
  );
}
