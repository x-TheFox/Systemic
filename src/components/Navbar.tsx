"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, LayoutDashboard, User, Mail, Swords, Shield, Activity, Check, X as XIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";

interface InboxMessage {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  metadata?: any;
}

interface DuelRequestModal {
  open: boolean;
  message?: InboxMessage;
}

export function Navbar() {
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxMessages, setInboxMessages] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [duelModal, setDuelModal] = useState<DuelRequestModal>({ open: false });
  const inboxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadInbox() {
      try {
        const res = await fetch("/api/inbox");
        if (!res.ok) return;
        const data = await res.json();
        setInboxMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      } catch {}
    }
    loadInbox();
    const interval = setInterval(loadInbox, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inboxRef.current && !inboxRef.current.contains(e.target as Node)) {
        setInboxOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/inbox/${id}`, { method: "POST" });
    setInboxMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function respondToDuel(duelId: string, action: "accept" | "decline") {
    try {
      const res = await fetch("/api/duels/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ duelId, action }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Duel ${action}ed!`);
      setDuelModal({ open: false });
      // Refresh inbox
      const inboxRes = await fetch("/api/inbox");
      if (inboxRes.ok) {
        const data = await inboxRes.json();
        setInboxMessages(data.messages || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      toast.error(`Failed to ${action} duel.`);
    }
  }

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/pulse", label: "Pulse", icon: Activity },
    { href: "/duels", label: "Duels", icon: Swords },
    { href: "/guilds", label: "Guilds", icon: Shield },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-base/70 backdrop-blur-2xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-[var(--radius-compact)] overflow-hidden shadow-glow group-hover:shadow-[0_0_20px_hsl(265_85%_60%/_0.35)] transition-shadow duration-300">
            <Image src="/icon.svg" alt="Systemics" width={32} height={32} className="object-contain" priority />
          </div>
          <span className="text-lg font-bold tracking-tight">
            <span className="gradient-text">Systemics</span>
          </span>
        </Link>

        <div className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="relative px-3 py-1.5 rounded-[var(--radius-compact)]">
                <div className="flex items-center gap-1.5 text-sm font-medium transition-colors duration-150">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-[var(--radius-compact)] bg-white/[0.08] border border-white/[0.06]"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  />
                )}
              </Link>
            );
          })}

          <div className="ml-3 pl-3 border-l border-white/[0.06] flex items-center gap-2">
            {mounted ? (
              <>
                <SignedIn>
                  {/* Inbox */}
                  <div className="relative" ref={inboxRef}>
                    <button
                      onClick={() => setInboxOpen(!inboxOpen)}
                      className="relative p-1.5 rounded-[var(--radius-compact)] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors"
                    >
                      <Mail className="h-4 w-4" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center">
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    <AnimatePresence>
                      {inboxOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.97 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 top-full mt-2 w-80 rounded-[var(--radius-container)] border border-white/[0.08] bg-overlay backdrop-blur-xl shadow-z-modal overflow-hidden"
                        >
                          <div className="p-3 border-b border-white/[0.06]">
                            <p className="text-sm font-semibold text-white">Inbox</p>
                          </div>
                          <div className="max-h-72 overflow-y-auto">
                            {inboxMessages.length === 0 ? (
                              <div className="p-4 text-center text-sm text-fg-muted">No messages</div>
                            ) : (
                              inboxMessages.slice(0, 10).map((msg) => (
                                <button
                                  key={msg.id}
                                  onClick={() => {
                                    if (!msg.read) markRead(msg.id);
                                    if (msg.type === "duel_request") {
                                      setDuelModal({ open: true, message: msg });
                                      setInboxOpen(false);
                                    } else if (msg.type === "guild_duel_request") {
                                      window.location.href = "/guilds";
                                    }
                                  }}
                                  className={`w-full text-left p-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                                    !msg.read ? "bg-white/[0.02]" : ""
                                  }`}
                                >
                                  <div className="flex items-start gap-2">
                                    {!msg.read && <div className="h-2 w-2 rounded-full bg-accent mt-1 shrink-0" />}
                                    <div className={`${msg.read ? "" : "ml-1"}`}>
                                      <p className={`text-xs ${!msg.read ? "font-semibold text-white" : "text-fg-dim"}`}>{msg.title}</p>
                                      <p className="text-[11px] text-fg-muted mt-0.5 line-clamp-2">{msg.body}</p>
                                    </div>
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <UserButton
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-7 w-7 ring-2 ring-accent/30 ring-offset-2 ring-offset-base",
                      }
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-in">
                    <span className="inline-flex items-center justify-center h-8 px-3 text-sm font-semibold rounded-[var(--radius-compact)] bg-accent text-white shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow duration-200">
                      Sign In
                    </span>
                  </Link>
                </SignedOut>
              </>
            ) : (
              <div className="h-7 w-7 rounded-full bg-surface" />
            )}
          </div>
        </div>
      </div>

      {/* Duel Request Modal */}
      <AnimatePresence>
        {duelModal.open && duelModal.message && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            onClick={() => setDuelModal({ open: false })}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="relative w-full max-w-sm rounded-[var(--radius-container)] border border-white/[0.08] bg-overlay backdrop-blur-xl p-6 shadow-z-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="h-14 w-14 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                  <Swords className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <h3 className="text-heading text-white">{duelModal.message.title}</h3>
                  <p className="text-sm text-fg-muted mt-1">{duelModal.message.body}</p>
                </div>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() =>
                      respondToDuel(duelModal.message?.metadata?.duelId, "decline")
                    }
                    className="flex-1 h-10 rounded-[var(--radius-compact)] bg-destructive/10 border border-destructive/30 text-destructive text-sm font-semibold hover:bg-destructive/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <XIcon className="h-4 w-4" />
                    Decline
                  </button>
                  <button
                    onClick={() =>
                      respondToDuel(duelModal.message?.metadata?.duelId, "accept")
                    }
                    className="flex-1 h-10 rounded-[var(--radius-compact)] bg-success/10 border border-success/30 text-success text-sm font-semibold hover:bg-success/20 transition-colors inline-flex items-center justify-center gap-1.5"
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </button>
                </div>
                <button
                  onClick={() => setDuelModal({ open: false })}
                  className="text-xs text-fg-muted hover:text-fg-dim transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
