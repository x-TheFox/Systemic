"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Megaphone, Trophy, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";
import { expandHeight, fadeUpItem } from "@/lib/motion";

interface WeeklyReport {
  id: string;
  weekNumber: number;
  year: number;
  content: string;
  mvpName: string | null;
  mvpXp: number;
  lurkerName: string | null;
  lurkerXp: number;
  totalXP: number;
  participants: number;
  rankings: Array<{ name: string; xp: number; activities: number; platforms: string[] }>;
  createdAt: string;
}

function renderInline(text: string): string {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, "<em><strong>$1</strong></em>")
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="px-1 py-0.5 rounded bg-white/[0.08] text-accent text-xs font-mono">$1</code>');
}

function MarkdownRender({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const dataRows = tableLines.filter((row) => !row.match(/^\|[\s\-:|]+\|$/));
      if (dataRows.length === 0) continue;
      const headerCells = dataRows[0].split("|").filter((c) => c.trim() !== "");
      const bodyRows = dataRows.slice(1).map((row) => row.split("|").filter((c) => c.trim() !== ""));
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.08]">
                {headerCells.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 text-left text-fg-dim font-medium whitespace-nowrap" dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }} />
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-fg-dim whitespace-nowrap" dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(<h3 key={i} className="text-lg font-bold text-white mt-4 mb-2" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />);
    } else if (line.startsWith("## ")) {
      elements.push(<h2 key={i} className="text-xl font-bold text-white mt-5 mb-2" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />);
    } else if (line.startsWith("# ")) {
      elements.push(<h1 key={i} className="text-2xl font-bold text-white mt-6 mb-3" dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />);
    } else if (line.trim() === "---") {
      elements.push(<hr key={i} className="border-white/[0.08] my-4" />);
    } else if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-sm text-fg-dim">
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      );
      continue;
    } else if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-sm text-fg-dim">
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ol>
      );
      continue;
    } else if (line.trim().startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("> ")) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote key={i} className="border-l-2 border-accent/40 pl-3 my-2 text-sm text-fg-muted italic">
          {quoteLines.map((ql, qi) => (
            <p key={qi} dangerouslySetInnerHTML={{ __html: renderInline(ql) }} />
          ))}
        </blockquote>
      );
      continue;
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-sm text-fg-dim leading-relaxed my-1.5" dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
      );
    }
    i++;
  }

  return <>{elements}</>;
}

export function WeeklyAnnouncement() {
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/weekly/latest");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (data.report) setReport(data.report);
      } catch (err) {
        console.error("Weekly announcement load error:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-[var(--radius-standard)]" />;
  }

  if (!report) {
    return (
      <div className="glass-card p-6 flex items-center gap-4">
        <Megaphone className="h-6 w-6 text-accent" />
        <div>
          <h3 className="text-white font-semibold">Weekly Post-Mortem</h3>
          <p className="text-sm text-fg-muted">The Ghost hasn&apos;t published a report yet. Check back after Sunday!</p>
        </div>
      </div>
    );
  }

  const lines = report.content.split("\n");
  const previewLines = lines.slice(0, 10);

  return (
    <motion.div
      variants={fadeUpItem}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="glass-card p-6 relative overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative">
          <Megaphone className="h-5 w-5 text-accent" />
          <span className="absolute -top-1 -right-1 h-2 w-2 bg-success rounded-full animate-pulse" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-semibold">The Ghost&apos;s Weekly Post-Mortem</h3>
            <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border border-accent/20 text-accent bg-accent/10">
              Week {report.weekNumber}, {report.year}
            </span>
          </div>
          <p className="text-[11px] text-fg-muted">
            {report.participants} grinders · {report.totalXP.toLocaleString()} XP gained
          </p>
        </div>
      </div>

      {/* MVP / Lurker */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 rounded-[var(--radius-standard)] bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-label text-amber-400/70">MVP</span>
          </div>
          <p className="text-sm font-bold text-white">{report.mvpName || "N/A"}</p>
          <p className="text-xs text-fg-muted font-mono">+{report.mvpXp.toLocaleString()} XP</p>
        </div>
        <div className="p-3 rounded-[var(--radius-standard)] bg-gradient-to-r from-red-500/10 to-transparent border border-red-500/20">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            <span className="text-label text-red-400/70">Lurker</span>
          </div>
          <p className="text-sm font-bold text-white">{report.lurkerName || "N/A"}</p>
          <p className="text-xs text-fg-muted font-mono">+{report.lurkerXp.toLocaleString()} XP</p>
        </div>
      </div>

      {/* Report content */}
      <div className="max-w-none">
        <div className={expanded ? "" : "opacity-60"}>
          <MarkdownRender text={previewLines.join("\n")} />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div
              variants={expandHeight}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <MarkdownRender text={lines.slice(10).join("\n")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-3 inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors font-medium"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? "Show less" : "Read full report"}
      </button>

      {/* Mini leaderboard */}
      {report.rankings && report.rankings.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/[0.06]">
          <p className="text-label text-fg-muted mb-2">Top Grinders This Week</p>
          <div className="space-y-1.5">
            {report.rankings.slice(0, 5).map((r, i) => {
              const maxWeekXP = Math.max(...report.rankings.map((x) => x.xp), 1);
              const pct = (r.xp / maxWeekXP) * 100;
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className={`w-5 text-right font-mono font-bold ${
                    i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-500" : "text-fg-muted"
                  }`}>
                    {i + 1}
                  </span>
                  <span className="text-fg-dim truncate flex-1">{r.name}</span>
                  <div className="w-16 h-1 bg-white/[0.04] rounded-full overflow-hidden hidden sm:block">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-fg-muted font-mono">{r.xp.toLocaleString()} XP</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}
