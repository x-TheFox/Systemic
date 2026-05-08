"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Trophy, Crown, ArrowLeft, LogOut, Pencil, Upload, X, Loader2 } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";

interface Guild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  adminId: string;
  admin: {
    id: string;
    name: string | null;
    githubHandle: string | null;
    imageUrl: string | null;
  };
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
  const router = useRouter();
  const slug = params.slug as string;
  const [guild, setGuild] = useState<Guild | null>(null);
  const [loading, setLoading] = useState(true);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const isAdmin = useMemo(() => !!(guild && myUserId && guild.adminId === myUserId), [guild, myUserId]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", iconUrl: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const [guildRes, profileRes] = await Promise.all([
          fetch(`/api/guilds?slug=${slug}`),
          fetch("/api/profile"),
        ]);
        if (guildRes.ok) {
          const data = await guildRes.json();
          setGuild(data.guild);
        }
        if (profileRes.ok) {
          const data = await profileRes.json();
          const uid = data.user?.id || null;
          setMyUserId(uid);
        }
      } catch {
        setGuild(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

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

      setEditForm((prev) => ({ ...prev, iconUrl: data.url }));
      toast.success("SVG uploaded!");
    } catch {
      toast.error("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function clearIcon() {
    setEditForm((prev) => ({ ...prev, iconUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function saveGuildEdit() {
    try {
      const res = await fetch(`/api/guilds?slug=${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Guild updated!");
      setEditing(false);
      const refresh = await fetch(`/api/guilds?slug=${slug}`);
      if (refresh.ok) {
        const data = await refresh.json();
        setGuild(data.guild);
      }
    } catch {
      toast.error("Failed to update guild.");
    }
  }

  async function leaveGuild() {
    const msg = isAdmin ? "Delete this guild? All members will be removed." : "Leave this guild?";
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/guilds/${slug}/join`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      toast.success(data.deleted ? "Guild deleted!" : "Left guild!");
      router.push("/guilds");
    } catch {
      toast.error("Failed to leave guild.");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-2xl bg-[#111113] border border-white/[0.04]" />
      </main>
    );
  }

  if (!guild) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white/40">
        Guild not found in the manifest.
      </main>
    );
  }

  const sortedMembers = [...guild.members].sort((a, b) => b.xp - a.xp);
  const totalGuildXP = guild.members.reduce((s, m) => s + m.xp, 0);

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="max-w-[1440px] mx-auto p-4 md:p-8 min-h-screen space-y-8"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Link href="/guilds" className="inline-flex items-center gap-2 text-white/50 hover:text-white transition-colors group">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#111113] border border-white/[0.06] group-hover:border-white/[0.12] transition-colors">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-wide">Back to Ecosystem</span>
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                onClick={() => {
                  if (!editing && guild) {
                    setEditForm({
                      name: guild.name,
                      description: guild.description || "",
                      iconUrl: guild.iconUrl || "",
                    });
                  }
                  setEditing(!editing);
                }}
                className="h-8 px-3 rounded-lg bg-[#111113] border border-white/[0.08] text-white/70 text-xs font-bold uppercase tracking-wider hover:text-white hover:bg-white/[0.04] transition-colors inline-flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Configure
              </button>
            )}
            {(isAdmin || guild.members.some((m) => m.id === myUserId)) && (
              <button
                onClick={leaveGuild}
                className="h-8 px-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-xs font-bold uppercase tracking-wider hover:bg-red-500/20 transition-colors inline-flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                {isAdmin ? "Disband" : "Resign"}
              </button>
            )}
          </div>
        </div>

        {/* Hero Header */}
        <motion.div variants={staggerItem} className="bg-[#111113] border border-white/[0.06] rounded-2xl p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            {/* Big Avatar */}
            <div className="flex-shrink-0">
              {guild.iconUrl ? (
                <div className="h-28 w-28 md:h-36 md:w-36 rounded-2xl overflow-hidden border border-white/[0.08] bg-[#18181b] flex items-center justify-center p-3 relative group">
                  <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-contain relative z-10" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-500/10 to-cyan-500/10" />
                </div>
              ) : (
                <div className="h-28 w-28 md:h-36 md:w-36 rounded-2xl bg-[#18181b] border border-white/[0.08] flex items-center justify-center shadow-inner relative group">
                  <span className="text-5xl font-bold text-white/80 group-hover:text-white transition-colors">{guild.name.charAt(0).toUpperCase()}</span>
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-2xl" />
                </div>
              )}
            </div>

            {/* Guild Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2">{guild.name}</h1>
              {guild.description && <p className="text-sm text-white/60 leading-relaxed max-w-xl mx-auto md:mx-0">{guild.description}</p>}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-6">
                {guild.admin && (
                  <Link href={guild.admin.githubHandle ? `/${guild.admin.githubHandle}` : "#"}>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-amber-500/20 text-xs font-semibold tracking-wide hover:border-amber-500/50 transition-colors">
                      <Crown className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-white/80">Admin: {guild.admin.name || guild.admin.githubHandle || "Unknown"}</span>
                    </span>
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-bold tracking-wide text-violet-400">
                  <Trophy className="h-3.5 w-3.5" />
                  {totalGuildXP.toLocaleString()} XP
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181b] border border-white/[0.06] text-xs font-semibold tracking-wide text-white/60">
                  <Users className="h-3.5 w-3.5 text-cyan-400" />
                  {guild.members.length} Members
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Edit Form */}
        <AnimatePresence>
          {editing && isAdmin && (
            <motion.div
              variants={staggerItem}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-[#111113] border border-white/[0.06] rounded-xl p-6 mb-8 mt-2 shadow-xl">
                <h2 className="text-lg font-bold text-white mb-4">Guild Configuration</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Guild Name</label>
                      <input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full h-10 px-3 rounded-lg bg-[#18181b] border border-white/[0.06] text-white text-[13px] font-medium focus:outline-none focus:border-violet-500/50 transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Mission Statement / Bio</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#18181b] border border-white/[0.06] text-white text-[13px] font-medium focus:outline-none focus:border-violet-500/50 transition-colors resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] tracking-widest uppercase font-bold text-white/40 mb-1.5 block">Guild Icon (SVG)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".svg,image/svg+xml"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    {editForm.iconUrl ? (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#18181b] border border-white/[0.06]">
                        <div className="h-10 w-10 rounded overflow-hidden border border-white/[0.08] bg-[#111113] flex items-center justify-center p-1">
                          <img src={editForm.iconUrl} alt="Preview" className="h-full w-full object-contain" />
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
                        className="w-full md:w-auto h-10 px-6 rounded-lg bg-[#18181b] border border-white/[0.06] text-white/40 hover:text-white hover:border-white/[0.12] transition-colors inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider"
                      >
                        <Upload className="h-3.5 w-3.5" />
                        Upload SVG Vector
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-white/[0.04]">
                    <button
                      onClick={saveGuildEdit}
                      className="h-9 px-5 rounded-lg bg-white text-black text-xs font-bold uppercase tracking-wider hover:bg-white/90 transition-colors"
                    >
                      Save Configuration
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="h-9 px-5 rounded-lg border border-white/[0.08] text-white/60 text-xs font-bold uppercase tracking-wider hover:bg-white/[0.04] hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Member Roster Data (Leaderboard) */}
        <motion.div variants={staggerItem} className="bg-[#111113] border border-white/[0.06] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wide">Guild Roster & Rank</h2>
          </div>
          <div className="space-y-2">
            {sortedMembers.map((member, i) => {
              const isMe = member.id === myUserId;
              return (
                <Link key={member.id} href={member.githubHandle ? `/${member.githubHandle}` : "#"}>
                  <div className={`group flex items-center gap-4 p-3 rounded-xl border ${isMe ? 'bg-[#18181b] border-violet-500/30' : 'bg-[#18181b] border-white/[0.04]'} hover:border-white/[0.12] transition-all duration-200`}>
                    <span className="text-[13px] font-mono font-bold text-white/30 w-6 text-center">{i + 1}</span>
                    
                    <div className="h-10 w-10 flex-shrink-0 rounded-lg overflow-hidden border border-white/[0.08] bg-[#111113]">
                      {member.imageUrl ? (
                        <img src={member.imageUrl} alt={member.name || ""} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center font-bold text-white/50 text-sm">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <p className="text-[14px] font-bold text-white/90 group-hover:text-white transition-colors truncate">
                        {member.name || member.email.split("@")[0]}
                        {isMe && <span className="ml-2 text-[10px] uppercase tracking-widest text-violet-400 font-bold px-1.5 py-0.5 rounded border border-violet-500/30 bg-violet-500/10">You</span>}
                      </p>
                      {member.title && <p className="text-[11px] text-amber-500/80 font-medium truncate mt-0.5">{member.title}</p>}
                    </div>
                    
                    <div className="text-right flex-shrink-0 pr-2">
                      <div className="text-base font-bold font-mono tabular-nums text-white/90">{member.xp.toLocaleString()}</div>
                      <div className="text-[9px] uppercase tracking-widest font-bold text-violet-400/80 mt-0.5">Total XP</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </motion.div>

      </div>
    </motion.main>
  );
}
