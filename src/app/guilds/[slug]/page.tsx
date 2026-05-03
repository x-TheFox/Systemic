"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, Users, Trophy, Crown, ArrowLeft, LogOut, Pencil, Upload, X, Loader2 } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  const [isAdmin, setIsAdmin] = useState(false);
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

  useEffect(() => {
    if (guild && myUserId) {
      setIsAdmin(guild.adminId === myUserId);
    }
  }, [guild, myUserId]);

  useEffect(() => {
    if (guild) {
      setEditForm({
        name: guild.name,
        description: guild.description || "",
        iconUrl: guild.iconUrl || "",
      });
    }
  }, [guild]);

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
        {/* Hero Header with Big Icon */}
        <motion.div variants={staggerItem} className="glass-card p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Big Guild Icon */}
            <div className="relative flex-shrink-0">
              {guild.iconUrl ? (
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-[var(--radius-standard)] overflow-hidden border-2 border-white/[0.08] bg-white/[0.03] flex items-center justify-center shadow-glow">
                  <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-contain p-2" />
                </div>
              ) : (
                <div className="h-24 w-24 md:h-32 md:w-32 rounded-[var(--radius-standard)] bg-gradient-to-br from-accent/20 to-cyan-500/20 border-2 border-accent/30 flex items-center justify-center shadow-glow">
                  <span className="text-4xl md:text-5xl font-bold text-accent">{guild.name.charAt(0).toUpperCase()}</span>
                </div>
              )}
            </div>

            {/* Guild Info */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <h1 className="text-display gradient-text">{guild.name}</h1>
              {guild.description && <p className="text-sm text-fg-muted mt-1">{guild.description}</p>}
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                {/* Admin */}
                {guild.admin && (
                  <Link href={guild.admin.githubHandle ? `/${guild.admin.githubHandle}` : "#"}>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-fg-dim hover:border-white/[0.12] transition-colors">
                      <Crown className="h-3 w-3 text-amber-400" />
                      <span>Admin: {guild.admin.name || guild.admin.githubHandle || "Unknown"}</span>
                    </span>
                  </Link>
                )}
                {/* Total XP */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent font-medium">
                  <Trophy className="h-3 w-3" />
                  {guild.members.reduce((s, m) => s + m.xp, 0).toLocaleString()} XP
                </span>
                {/* Members */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] text-xs text-fg-dim">
                  <Users className="h-3 w-3" />
                  {guild.members.length} members
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href="/guilds" className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="h-9 px-3 rounded-[var(--radius-compact)] bg-white/[0.04] border border-white/[0.08] text-fg-dim text-xs font-semibold hover:text-white hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={leaveGuild}
                    className="h-9 px-3 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors inline-flex items-center gap-1.5"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </>
              )}
              {!isAdmin && guild.members.some((m) => m.id === myUserId) && (
                <button
                  onClick={leaveGuild}
                  className="h-9 px-3 rounded-[var(--radius-compact)] bg-white/[0.04] border border-white/[0.08] text-fg-dim text-xs font-semibold hover:text-white hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Leave
                </button>
              )}
            </div>
          </div>
        </motion.div>


              <div>
                <h1 className="text-display gradient-text">{guild.name}</h1>
                {guild.description && <p className="text-sm text-fg-muted">{guild.description}</p>}
              </div>
            </div>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="h-9 px-3 rounded-[var(--radius-compact)] bg-white/[0.04] border border-white/[0.08] text-fg-dim text-xs font-semibold hover:text-white hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
              <button
                onClick={leaveGuild}
                className="h-9 px-3 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors inline-flex items-center gap-1.5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Delete Guild
              </button>
            </div>
          )}
          {!isAdmin && guild.members.some((m) => m.id === myUserId) && (
            <button
              onClick={leaveGuild}
              className="h-9 px-3 rounded-[var(--radius-compact)] bg-white/[0.04] border border-white/[0.08] text-fg-dim text-xs font-semibold hover:text-white hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Leave
            </button>
          )}
        </motion.div>

        {/* Edit Form */}
        {editing && isAdmin && (
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
            <h2 className="text-heading text-white">Edit Guild</h2>
            <div className="space-y-3">
              <div>
                <label className="text-label text-fg-muted mb-1 block">Guild Name</label>
                <input
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50"
                />
              </div>
              <div>
                <label className="text-label text-fg-muted mb-1 block">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50 resize-none"
                />
              </div>
              <div>
                <label className="text-label text-fg-muted mb-1 block">Guild Icon</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {editForm.iconUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06]">
                    <div className="h-10 w-10 rounded-[var(--radius-compact)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                      <img src={editForm.iconUrl} alt="Preview" className="h-full w-full object-contain" />
                    </div>
                    <span className="text-sm text-fg-dim flex-1 truncate">
                      Icon uploaded
                    </span>
                    <button
                      onClick={clearIcon}
                      className="h-7 w-7 rounded-[var(--radius-compact)] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : uploading ? (
                  <div className="w-full h-10 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06] border-dashed text-fg-muted inline-flex items-center justify-center gap-2 text-sm">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-10 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06] border-dashed text-fg-muted hover:text-fg-dim hover:border-white/[0.12] transition-colors inline-flex items-center justify-center gap-2 text-sm"
                  >
                    <Upload className="h-4 w-4" />
                    Upload SVG
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveGuildEdit}
                  className="h-9 px-4 rounded-[var(--radius-compact)] bg-accent text-white text-sm font-semibold"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="h-9 px-4 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

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
