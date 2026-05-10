"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, Shield, Upload, X, Loader2, Trophy, Crown, Activity, ExternalLink } from "lucide-react";
import { pageEntrance, staggerItem, statReveal } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { PulseFeed } from "@/components/PulseFeed";

interface Guild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  adminId: string;
  _count: { members: number };
  admin?: { name?: string | null; githubHandle?: string | null };
  totalXP?: number;
  members?: any[];
}

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [globalXP, setGlobalXP] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", iconUrl: "" });
  const [uploading, setUploading] = useState(false);
  const [myGuildId, setMyGuildId] = useState<string | null>(null);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildsRes, profileRes] = await Promise.all([
          fetch("/api/guilds"),
          fetch("/api/profile"),
        ]);
        if (guildsRes.ok) {
          const data = await guildsRes.json();
          const loadedGuilds = data.guilds || [];
          setGuilds(loadedGuilds);
          
          let xpAccumulator = 0;
          loadedGuilds.forEach((g: any) => {
            if (g.totalXP) xpAccumulator += g.totalXP;
            else if (g.members) xpAccumulator += g.members.reduce((s: number, m: any) => s + m.xp, 0);
          });
          setGlobalXP(xpAccumulator);
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

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg")) {
      toast.error("Only SVG files are allowed.");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Upload failed");
        return;
      }

      setForm((prev) => ({ ...prev, iconUrl: data.url }));
      toast.success("SVG uploaded!");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearIcon() {
    setForm((prev) => ({ ...prev, iconUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function createGuild() {
    try {
      const res = await fetch("/api/guilds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Guild created!");
      setShowCreate(false);
      setForm({ name: "", slug: "", description: "", iconUrl: "" });
      const refresh = await fetch("/api/guilds");
      const data = await refresh.json();
      setGuilds(data.guilds || []);
    } catch {
      toast.error("Failed to create guild.");
    }
  }

  async function joinGuild(slug: string) {
    try {
      const res = await fetch(`/api/guilds/${slug}/join`, { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Joined guild!");
      const profileRes = await fetch("/api/profile");
      if (profileRes.ok) {
        const data = await profileRes.json();
        setMyGuildId(data.user?.guildId || null);
      }
    } catch {
      toast.error("Failed to join guild.");
    }
  }

  async function leaveGuild(guildId: string) {
    const guild = guilds.find((g) => g.id === guildId);
    if (!guild) return;

    const isAdmin = guild.adminId === myUserId;
    if (isAdmin) {
      const confirmed = confirm(
        `WARNING: You are the admin of "${guild.name}".\n\nLeaving will PERMANENTLY DELETE this guild and remove all members. This cannot be undone.\n\nAre you absolutely sure?`
      );
      if (!confirmed) return;
    }

    try {
      const res = await fetch(`/api/guilds/${guild.slug}/join`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(data.deleted ? `Guild "${guild.name}" deleted.` : "Left guild!");
      setMyGuildId(null);
      const refresh = await fetch("/api/guilds");
      const refreshData = await refresh.json();
      setGuilds(refreshData.guilds || []);
    } catch {
      toast.error("Failed to leave guild.");
    }
  }

  const topGuild = guilds.length > 0 ? [...guilds].sort((a: any, b: any) => {
    const aXP = a.totalXP ?? a.members?.reduce((s: number, m: any) => s + m.xp, 0) ?? 0;
    const bXP = b.totalXP ?? b.members?.reduce((s: number, m: any) => s + m.xp, 0) ?? 0;
    return bXP - aXP;
  })[0] : null;

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="mx-auto max-w-[1440px] px-4 sm:px-6 py-8 space-y-10 min-h-screen"
    >
      {/* ============================================================== */}
      {/* 1. HERO / GLOBAL GUILDS HEADER */}
      {/* ============================================================== */}
      <motion.div variants={staggerItem} className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 text-white/40 mb-1">
              <Shield className="h-4 w-4" />
              <span className="text-[10px] font-semibold uppercase tracking-widest">Co-op Engineering</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">Guild Ecosystem</h1>
          </div>
          
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="h-10 px-4 rounded-xl bg-violet-600 text-white text-sm font-bold tracking-wide hover:bg-violet-500 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Establish Guild
          </button>
        </div>

        {/* Global Stats Row */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl bg-[#111113] border border-white/[0.04]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Active Guilds" value={guilds.length.toString()} icon={<Shield className="h-4 w-4 text-violet-400" />} />
            <StatCard label="Total Community XP" value={globalXP.toLocaleString()} icon={<Activity className="h-4 w-4 text-cyan-400" />} />
            <StatCard label="Leading Guild" value={topGuild?.name || "-"} icon={<Crown className="h-4 w-4 text-amber-400" />} />
            <StatCard label="Your Guild Status" value={myGuildId ? guilds.find(g => g.id === myGuildId)?.name || "Active" : "Independent"} icon={<Users className="h-4 w-4 text-pink-400" />} />
          </div>
        )}
      </motion.div>

      {/* ============================================================== */}
      {/* GUILDS GRID & RIGHT RAIL */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Creation & Featured Guilds (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                animate={{ opacity: 1, height: "auto", scale: 1 }}
                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="bg-[#111113] border border-white/[0.08] rounded-xl p-5 sm:p-6 mb-2">
                  <h2 className="text-[15px] font-bold text-white mb-4">Establish New Guild</h2>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Guild Name</label>
                        <input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full h-10 px-3 rounded-lg bg-[#18181b] border border-white/[0.06] text-white text-[13px] font-medium focus:outline-none focus:border-violet-500/50 transition-colors"
                          placeholder="e.g. Frontend Masters"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Guild Slug</label>
                        <input
                          value={form.slug}
                          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                          className="w-full h-10 px-3 rounded-lg bg-[#18181b] border border-white/[0.06] text-white text-[13px] font-medium focus:outline-none focus:border-violet-500/50 transition-colors"
                          placeholder="frontend-masters"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Mission Statement / Bio</label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.06] text-white text-[13px] font-medium focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                        placeholder="What is your guild's primary focus?"
                      />
                    </div>
                    {/* SVG Upload */}
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Guild Icon (SVG)</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".svg,image/svg+xml"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      {form.iconUrl ? (
                        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#18181b] border border-white/[0.06]">
                          <div className="h-10 w-10 rounded overflow-hidden border border-white/[0.08] bg-[#111113] flex items-center justify-center p-1">
                            <img src={form.iconUrl} alt="Preview" className="h-full w-full object-contain" />
                          </div>
                          <span className="text-xs text-white/60 flex-1 truncate">
                            Icon uploaded successfully
                          </span>
                          <button
                            onClick={clearIcon}
                            className="h-7 w-7 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors flex items-center justify-center shrink-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : uploading ? (
                        <div className="w-full h-10 rounded-lg bg-[#18181b] border border-white/[0.06] text-white/40 inline-flex items-center justify-center gap-2 text-xs font-semibold">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          UPLOADING...
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full h-10 rounded-lg bg-[#18181b] border border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.12] transition-colors inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Upload SVG Vector
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t border-white/[0.04]">
                      <button onClick={createGuild} className="h-9 px-5 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors">
                        Deploy Guild
                      </button>
                      <button onClick={() => setShowCreate(false)} className="h-9 px-5 rounded-lg border border-white/[0.08] text-white/60 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.04] hover:text-white transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06] mt-2">
            <Trophy className="h-4 w-4 text-violet-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Featured Collectives</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-xl bg-[#111113] border border-white/[0.04]" />
              ))
            ) : guilds.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-white/40">
                <Users className="h-8 w-8 mb-3 opacity-50" />
                <p className="text-[13px] font-semibold tracking-wide">Ecosystem is empty. Initialize the first guild.</p>
              </div>
            ) : (
              guilds.map((guild: any) => {
                const guildXP = guild.totalXP ?? guild.members?.reduce((s: number, m: any) => s + m.xp, 0) ?? 0;
                const memberCount = guild._count?.members || guild.members?.length || 0;
                const adminName = guild.admin?.name || guild.admin?.githubHandle || "Unknown";

                return (
                  <div key={guild.id} className="group relative flex flex-col p-5 bg-[#111113] border border-white/[0.06] rounded-xl hover:border-white/[0.12] hover:bg-[#18181b] transition-all duration-300">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {guild.iconUrl ? (
                          <div className="h-14 w-14 rounded-lg overflow-hidden border border-white/[0.08] bg-[#18181b] flex items-center justify-center">
                            <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-contain p-1.5" />
                          </div>
                        ) : (
                          <div className="h-14 w-14 rounded-lg bg-[#18181b] border border-white/[0.06] flex items-center justify-center shadow-inner">
                            <span className="text-xl font-bold text-white/80">{guild.name.charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <Link href={`/guilds/${guild.slug}`} className="block">
                          <h3 className="text-base font-bold text-white/90 group-hover:text-white transition-colors truncate">{guild.name}</h3>
                        </Link>
                        {guild.description && <p className="text-[11px] text-white/50 truncate mt-0.5">{guild.description}</p>}
                        
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase border border-amber-500/30 text-amber-500/80 bg-amber-500/5 rounded truncate">
                            <Crown className="h-2 w-2 mr-1" /> {adminName}
                          </span>
                          <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold tracking-widest uppercase border border-cyan-500/30 text-cyan-400/80 bg-cyan-500/5 rounded">
                            <Users className="h-2 w-2 mr-1" /> {memberCount}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto flex items-end justify-between pt-4 border-t border-white/[0.04]">
                      <div className="flex flex-col">
                        <span className="text-lg font-bold tabular-nums text-white/90">{guildXP.toLocaleString()}</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-violet-400">Total XP</span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/guilds/${guild.slug}`}>
                          <span className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/60 text-[11px] font-bold uppercase tracking-wider hover:text-white hover:bg-white/[0.08] hover:border-white/[0.15] transition-all inline-flex items-center">
                            Open <ExternalLink className="h-3 w-3 ml-1.5" />
                          </span>
                        </Link>
                        {myGuildId === guild.id ? (
                          <button
                            onClick={() => leaveGuild(guild.id)}
                            className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all"
                          >
                            Leave
                          </button>
                        ) : myGuildId ? (
                          <span className="h-8 px-3 rounded-lg bg-transparent border border-transparent text-white/30 text-[11px] font-bold uppercase tracking-wider inline-flex items-center select-none pt-1">
                            Locked
                          </span>
                        ) : (
                          <button
                            onClick={() => joinGuild(guild.slug)}
                            className="h-8 px-3 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-400 text-[11px] font-bold uppercase tracking-wider hover:bg-violet-500/20 transition-all"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* RIGHT RAIL: Network Pulse / Competitions (4 cols) */}
        {/* ============================================================== */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="flex items-center gap-2.5 pb-2 border-b border-white/[0.06]">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-white tracking-wide">Network Telemetry</h2>
          </div>
          
          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-4 flex-1 min-h-[400px]">
            <PulseFeed />
          </div>

          <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transition-opacity group-hover:opacity-10">
              <Shield className="h-32 w-32" />
            </div>
            <h3 className="text-[13px] font-bold text-white mb-2">Guild Wars Active</h3>
            <p className="text-[11px] text-white/50 leading-relaxed mb-4">
              Challenge rival engineering collectives to XP duels. Establish dominance within the system architecture and claim the top podium.
            </p>
            <Link href="/leaderboard" className="text-[11px] font-bold text-violet-400 uppercase tracking-widest hover:text-violet-300 transition-colors">
              View Global Standings &rarr;
            </Link>
          </div>
        </div>
      </div>
    </motion.main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="relative group overflow-hidden rounded-xl p-4 sm:p-5 bg-[#111113] border border-white/[0.06] hover:border-white/[0.12] transition-colors duration-200">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-violet-500/50 to-cyan-500/50" />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
          {icon}
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest text-white truncate">{label}</span>
        </div>
        <div className="text-2xl sm:text-3xl font-semibold tabular-nums tracking-tight text-white/90 group-hover:text-white transition-colors truncate">
          {value}
        </div>
      </div>
    </div>
  );
}
