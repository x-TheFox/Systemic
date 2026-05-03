"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Trophy, User, Search, Zap,
  Activity, Swords, Shield, BarChart3, KeyRound,
  GitBranch, Sparkles, MessageSquare, Radio,
} from "lucide-react";

const commands = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/", shortcut: "D" },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy, href: "/leaderboard", shortcut: "L" },
  { id: "pulse", label: "Pulse", icon: Activity, href: "/pulse", shortcut: "U" },
  { id: "duels", label: "Duels", icon: Swords, href: "/duels", shortcut: "E" },
  { id: "guilds", label: "Guilds", icon: Shield, href: "/guilds", shortcut: "G" },
  { id: "profile", label: "Profile", icon: User, href: "/profile", shortcut: "P" },
  { id: "compare", label: "Compare", icon: BarChart3, href: "/compare", shortcut: "C" },
  { id: "donate-key", label: "Donate API Key", icon: KeyRound, href: "/donate-key", shortcut: "K" },
  { id: "skill-tree", label: "Skill Tree", icon: Sparkles, href: "/", shortcut: "S" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggle]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  function run(cmd: typeof commands[0]) {
    router.push(cmd.href);
    setOpen(false);
    setQuery("");
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]"
          onClick={() => setOpen(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-lg mx-4 rounded-[var(--radius-container)] bg-overlay border border-white/[0.08] shadow-z-modal overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
              <Search className="h-4 w-4 text-fg-muted shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-fg-muted outline-none"
              />
              <span className="text-[10px] text-fg-muted font-mono border border-white/[0.08] px-1.5 py-0.5 rounded">ESC</span>
            </div>
            <div className="p-1.5 max-h-80 overflow-y-auto">
              {filtered.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => run(cmd)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-compact)] text-sm text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors text-left"
                >
                  <cmd.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{cmd.label}</span>
                  <span className="text-[10px] text-fg-muted font-mono border border-white/[0.08] px-1.5 py-0.5 rounded">
                    {cmd.shortcut}
                  </span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-fg-muted">
                  No commands found.
                </div>
              )}
            </div>
            <div className="px-4 py-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-fg-muted">
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3" /> Systemics Command
              </span>
              <span>Ctrl / Cmd + K to toggle</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
