"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { KeyRound, ArrowLeft, ExternalLink, Shield, Zap, Trophy, Trash2, Eye, EyeOff, Copy, Check } from "lucide-react";
import { pageEntrance, staggerItem } from "@/lib/motion";
import Link from "next/link";
import { toast } from "sonner";

interface DonatedKey {
  id: string;
  provider: string;
  isActive: boolean;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function DonateKeyPage() {
  const [keys, setKeys] = useState<DonatedKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    loadKeys();
  }, []);

  async function loadKeys() {
    try {
      const res = await fetch("/api/donated-keys");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setKeys(data.keys || []);
    } catch {
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }

  async function submitKey() {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/donated-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim(), provider: "groq" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to donate key");
        return;
      }
      toast.success("API key donated! Thank you for supporting Systemics.");
      setApiKey("");
      loadKeys();
    } catch {
      toast.error("Failed to donate key");
    } finally {
      setSubmitting(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? It will no longer be used.")) return;
    try {
      const res = await fetch(`/api/donated-keys?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Key revoked");
      loadKeys();
    } catch {
      toast.error("Failed to revoke key");
    }
  }

  const totalUses = keys.reduce((s, k) => s + k.useCount, 0);

  return (
    <motion.main
      variants={pageEntrance}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-4 md:p-8"
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.div variants={staggerItem} className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center justify-center h-9 w-9 rounded-[var(--radius-compact)] border border-white/[0.08] text-fg-dim hover:text-white hover:bg-white/[0.04] transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-3">
            <KeyRound className="h-6 w-6 text-accent" />
            <h1 className="text-display gradient-text">Donate API Key</h1>
          </div>
        </motion.div>

        {/* Hero Card */}
        <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-[var(--radius-standard)] bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0">
              <Zap className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h2 className="text-heading text-white">Why donate a key?</h2>
              <p className="text-sm text-fg-muted mt-1">
                Systemics runs on Groq LLMs to analyze GitHub repos, generate skill trees, 
                award badges, and more. API keys have rate limits — by donating yours, you 
                help the whole community grind faster. Your key is encrypted and never exposed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.04] text-center">
              <Shield className="h-5 w-5 text-success mx-auto mb-1" />
              <div className="text-xs text-fg-dim">AES-256 encrypted</div>
            </div>
            <div className="p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.04] text-center">
              <EyeOff className="h-5 w-5 text-cyan-400 mx-auto mb-1" />
              <div className="text-xs text-fg-dim">Never visible to anyone</div>
            </div>
            <div className="p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.04] text-center">
              <Trophy className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <div className="text-xs text-fg-dim">Track your impact</div>
            </div>
          </div>
        </motion.div>

        {/* How to get a key */}
        <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-heading text-white">How to get a Groq API key</h2>
            <span className="text-xs text-accent">{showGuide ? "Hide" : "Show"} guide</span>
          </button>

          {showGuide && (
            <div className="space-y-4">
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    title: "Create a Groq account",
                    desc: "Go to groq.com and sign up with your email or GitHub.",
                    link: "https://console.groq.com/login",
                  },
                  {
                    step: 2,
                    title: "Navigate to API Keys",
                    desc: "Once logged in, click your profile → API Keys in the left sidebar.",
                    link: "https://console.groq.com/keys",
                  },
                  {
                    step: 3,
                    title: "Create a new key",
                    desc: "Click 'Create API Key', give it a name like 'Systemics', and copy the key. It starts with gsk_",
                    link: null,
                  },
                  {
                    step: 4,
                    title: "Paste it below",
                    desc: "Come back here and paste your key. We'll encrypt it immediately.",
                    link: null,
                  },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-accent">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-fg-muted">{item.desc}</p>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 mt-0.5"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Open link
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Submit Form */}
        <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
          <h2 className="text-heading text-white">Donate your key</h2>
          <div className="space-y-3">
            <div>
              <label className="text-label text-fg-muted mb-1 block">Groq API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full h-10 px-3 rounded-[var(--radius-compact)] bg-surface border border-white/[0.08] text-white text-sm focus:outline-none focus:border-accent/50 font-mono"
              />
              <p className="text-[11px] text-fg-muted mt-1">
                Must start with <code className="text-accent">gsk_</code>. Your key is encrypted before storage.
              </p>
            </div>
            <button
              onClick={submitKey}
              disabled={submitting || !apiKey.trim()}
              className="w-full h-10 rounded-[var(--radius-compact)] bg-accent text-white text-sm font-semibold shadow-glow hover:shadow-[0_0_24px_hsl(265_85%_60%/_0.4)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              <Zap className="h-4 w-4" />
              {submitting ? "Encrypting..." : "Donate Key"}
            </button>
          </div>
        </motion.div>

        {/* Your Keys */}
        <motion.div variants={staggerItem} className="glass-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-white">Your donated keys</h2>
            {totalUses > 0 && (
              <span className="text-xs text-accent font-medium">
                {totalUses.toLocaleString()} total requests served
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-12 bg-white/[0.02] rounded-[var(--radius-compact)] animate-pulse" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <p className="text-sm text-fg-muted text-center py-4">No keys donated yet.</p>
          ) : (
            <div className="space-y-2">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-compact)] bg-white/[0.02] border border-white/[0.04]"
                >
                  <div className={`h-2 w-2 rounded-full ${key.isActive ? 'bg-success' : 'bg-fg-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">
                      {key.provider} — {key.id.slice(0, 8)}...
                    </p>
                    <p className="text-[11px] text-fg-muted">
                      {key.useCount.toLocaleString()} uses
                      {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => revokeKey(key.id)}
                    className="h-7 w-7 rounded-[var(--radius-compact)] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center justify-center"
                    title="Revoke key"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </motion.main>
  );
}
