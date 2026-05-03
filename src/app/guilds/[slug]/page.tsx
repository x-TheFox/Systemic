"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Users, Trophy, Crown, ArrowLeft } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";

interface Guild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  adminId: string;
  members: Array<{
    id: string;
    name: string | null;
    email: string;
    imageUrl: string | null;
    githubHandle: string | null;
    title: string | null;
    xp: number;
  }>;
  badges: any[];
}

export default function GuildDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/guilds?slug=${slug}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setGuild(data.guild);
      } catch {
        setGuild(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-[var(--radius-container)]" />
      </main>
    );
  }

  if (!guild) {
    return (
      <main className="min-h-screen flex items-center justify-center text-fg-muted">
        Guild not found.
      </main>
    );
  }

  const sortedMembers = [...guild.members].sort((a, b) => b.xp - a.xp);

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <Link href="/guilds" className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            {guild.iconUrl ? (
              <img src={guild.iconUrl} alt={guild.name} className="h-10 w-10 rounded-[var(--radius-compact)]" />
            ) : (
              <Shield className="h-8 w-8 text-accent" />
            )}
            <div>
              <h1 className="text-display gradient-text">{guild.name}</h1>
              {guild.description && <p className="text-sm text-fg-muted">{guild.description}</p>}
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div variants={staggerItem} className="grid grid-cols-3 gap-3">
          <div className="glass-card p-4 text-center">
            <Users className="h-5 w-5 text-accent mx-auto mb-1" />
            <div className="text-stat text-white">{guild.members.length}</div>
            <div className="text-label text-fg-muted">Members</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Trophy className="h-5 w-5 text-amber-400 mx-auto mb-1" />
            <div className="text-stat text-white">{guild.members.reduce((s, m) => s + m.xp, 0).toLocaleString()}</div>
            <div className="text-label text-fg-muted">Total XP</div>
          </div>
          <div className="glass-card p-4 text-center">
            <Crown className="h-5 w-5 text-yellow-400 mx-auto mb-1" />
            <div className="text-stat text-white">{sortedMembers[0]?.xp.toLocaleString() || 0}</div>
            <div className="text-label text-fg-muted">Top XP</div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        <motion.div variants={staggerItem} className="glass-card p-6">
          <h2 className="text-heading text-white mb-4">Guild Leaderboard</h2>
          <div className="space-y-2">
            {sortedMembers.map((member, i) => (
              <Link key={member.id} href={member.githubHandle ? `/${member.githubHandle}` : "#"}>
                <div className="flex items-center gap-3 p-3 rounded-[var(--radius-standard)] bg-white/[0.02] border border-white/[0.04] hover:border-accent/20 transition-colors">
                  <span className="text-xs font-mono font-bold text-fg-muted w-6">{i + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={member.imageUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-accent to-cyan-500 text-white text-xs font-bold">
                      {(member.name || member.email).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{member.name || member.email.split("@")[0]}</p>
                    {member.title && <p className="text-xs text-amber-400">{member.title}</p>}
                  </div>
                  <div className="text-sm font-bold font-mono text-white">{member.xp.toLocaleString()} <span className="text-accent text-xs">XP</span></div>
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.main>
  );
}
