"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Crown, Shield, Upload, X } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";

interface Guild {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconUrl: string | null;
  isPublic: boolean;
  adminId: string;
  _count: { members: number };
}

export default function GuildsPage() {
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "", iconUrl: "" });
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

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/svg+xml" && !file.name.endsWith(".svg")) {
      toast.error("Only SVG files are allowed.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content.trim().match(/<svg[\s>]/i)) {
        toast.error("Invalid SVG file — must contain a <svg> tag.");
        return;
      }
      setForm((prev) => ({ ...prev, iconUrl: content }));
      toast.success("SVG uploaded!");
    };
    reader.readAsText(file);
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
      // Refresh
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
      // Refresh profile to update guild status
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

    // Check if user is admin of this guild
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
      // Refresh list
      const refresh = await fetch("/api/guilds");
      const refreshData = await refresh.json();
      setGuilds(refreshData.guilds || []);
    } catch {
      toast.error("Failed to leave guild.");
    }
  }

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-accent" />
            <h1 className="text-display gradient-text">Guilds</h1>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="h-9 px-4 rounded-[var(--radius-compact)] bg-accent text-white text-sm font-semibold shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow inline-flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Guild
          </button>
        </motion.div>

        {showCreate && (
          <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
            <h2 className="text-heading text-white">Create Guild</h2>
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Guild Name"
                className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50"
              />
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                placeholder="guild-slug"
                className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50"
              />
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50 resize-none"
              />
              {/* SVG Upload */}
              <div>
                <label className="text-label text-fg-muted mb-1 block">Guild Icon</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".svg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {form.iconUrl ? (
                  <div className="flex items-center gap-3 p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06]">
                    <div className="h-10 w-10 rounded-[var(--radius-compact)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                      {form.iconUrl.trim().match(/<svg[\s>]/i) ? (
                        <div dangerouslySetInnerHTML={{ __html: form.iconUrl }} className="h-6 w-6" />
                      ) : (
                        <img src={form.iconUrl} alt="Preview" className="h-full w-full object-cover" />
                      )}
                    </div>
                    <span className="text-sm text-fg-dim flex-1 truncate">
                      {form.iconUrl.length > 60 ? "SVG uploaded" : form.iconUrl.slice(0, 40)}
                    </span>
                    <button
                      onClick={clearIcon}
                      className="h-7 w-7 rounded-[var(--radius-compact)] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
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
                <button onClick={createGuild} className="h-9 px-4 rounded-[var(--radius-compact)] bg-accent text-white text-sm font-semibold">
                  Create
                </button>
                <button onClick={() => setShowCreate(false)} className="h-9 px-4 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim text-sm">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[var(--radius-standard)]" />
            ))
          ) : guilds.length === 0 ? (
            <div className="col-span-full text-center py-16 text-fg-muted">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No guilds yet. Be the first to create one!</p>
            </div>
          ) : (
            guilds.map((guild) => (
              <div key={guild.id} className="glass-card p-5 hover:border-accent/20 transition-colors">
                <div className="flex items-start gap-3 mb-3">
                  {/* Guild Icon */}
                  <div className="flex-shrink-0">
                    {guild.iconUrl ? (
                      <div className="h-10 w-10 rounded-[var(--radius-compact)] overflow-hidden border border-white/[0.08] bg-white/[0.03] flex items-center justify-center">
                        {guild.iconUrl.trim().match(/<svg[\s>]/i) ? (
                          <div dangerouslySetInnerHTML={{ __html: guild.iconUrl }} className="h-6 w-6" />
                        ) : (
                          <img src={guild.iconUrl} alt={guild.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-[var(--radius-compact)] bg-accent/10 border border-accent/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-accent" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h3 className="text-lg font-bold text-white truncate">{guild.name}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/[0.08] text-fg-muted shrink-0 ml-2">
                        {guild._count.members} members
                      </span>
                    </div>
                    {guild.description && <p className="text-sm text-fg-muted truncate">{guild.description}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link href={`/guilds/${guild.slug}`}>
                    <span className="h-8 px-3 rounded-[var(--radius-compact)] bg-white/[0.04] border border-white/[0.08] text-fg-dim text-xs font-semibold hover:text-white hover:border-white/[0.15] transition-colors inline-flex items-center">
                      View
                    </span>
                  </Link>
                  {myGuildId === guild.id ? (
                    <button
                      onClick={() => leaveGuild(guild.id)}
                      className="h-8 px-3 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold hover:bg-destructive/20 transition-colors"
                    >
                      Leave
                    </button>
                  ) : myGuildId ? (
                    <span className="h-8 px-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.06] text-fg-muted text-xs font-semibold inline-flex items-center">
                      In another guild
                    </span>
                  ) : (
                    <button
                      onClick={() => joinGuild(guild.slug)}
                      className="h-8 px-3 rounded-[var(--radius-compact)] bg-accent/10 border border-accent/30 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                    >
                      Join
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
