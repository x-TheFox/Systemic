"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Trophy, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cascadeVariants, fadeInUp } from '@/lib/motion';

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
    .replace(/\*\*\*(.+?)\*\*\*/g, '<em><strong>$1</strong></em>')
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:var(--color-text-primary);font-weight:600">$1</strong>`)
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, `<code style="padding:2px 4px;border-radius:4px;background:var(--color-accent-secondary-dim);color:var(--color-accent-secondary);font-size:12px;font-family:monospace">$1</code>`);
}

function MarkdownRender({ text }: { text: string }) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection: | header | header |
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const dataRows = tableLines.filter(row => !row.match(/^\|[\s\-:|]+\|$/));
      if (dataRows.length === 0) continue;

      const headerCells = dataRows[0].split('|').filter(c => c.trim() !== '');
      const bodyRows = dataRows.slice(1).map(row => row.split('|').filter(c => c.trim() !== ''));

      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-default)' }}>
                {headerCells.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-3 py-2 text-left font-medium whitespace-nowrap"
                    style={{ color: 'var(--color-text-muted)' }}
                    dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, ri) => (
                <tr
                  key={ri}
                  className="hover:brightness-110 transition-all"
                  style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
                >
                  {row.map((cell, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 whitespace-nowrap"
                      style={{ color: 'var(--color-text-secondary)' }}
                      dangerouslySetInnerHTML={{ __html: renderInline(cell.trim()) }}
                    />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-lg font-bold mt-4 mb-2" style={{ color: 'var(--color-text-primary)' }} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(4)) }} />);
    } else if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-xl font-bold mt-5 mb-2" style={{ color: 'var(--color-text-primary)' }} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(3)) }} />);
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3" style={{ color: 'var(--color-text-primary)' }} dangerouslySetInnerHTML={{ __html: renderInline(line.slice(2)) }} />);
    }
    // Divider
    else if (line.trim() === '---') {
      elements.push(<hr key={i} style={{ borderColor: 'var(--color-border-default)' }} className="my-4" />);
    }
    // Unordered list
    else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ul>
      );
      continue;
    }
    // Ordered list
    else if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {listItems.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
          ))}
        </ol>
      );
      continue;
    }
    // Blockquote
    else if (line.trim().startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('> ')) {
        quoteLines.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={i}
          className="pl-3 my-2 text-sm italic"
          style={{
            borderLeft: `2px solid var(--color-accent-secondary)`,
            color: 'var(--color-text-muted)',
          }}
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} dangerouslySetInnerHTML={{ __html: renderInline(ql) }} />
          ))}
        </blockquote>
      );
      continue;
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm leading-relaxed my-1.5" style={{ color: 'var(--color-text-secondary)' }} dangerouslySetInnerHTML={{ __html: renderInline(line) }} />
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
  const [readProgress, setReadProgress] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/weekly/latest');
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        if (data.report) setReport(data.report);
      } catch (err) {
        console.error('Weekly announcement load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Reading progress tracking
  const handleScroll = useCallback(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight > 0) {
      setReadProgress(Math.min((scrollTop / scrollHeight) * 100, 100));
    }
  }, []);

  if (loading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  if (!report) {
    return (
      <motion.div
        variants={cascadeVariants}
        initial="hidden"
        animate="visible"
        custom={0}
        className="prismatic-card p-6 flex items-center gap-4"
      >
        <Megaphone className="h-6 w-6" style={{ color: 'var(--color-accent-secondary)' }} />
        <div>
          <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Weekly Post-Mortem
          </h3>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            The Ghost hasn&apos;t published a report yet. Check back after Sunday!
          </p>
        </div>
      </motion.div>
    );
  }

  const lines = report.content.split('\n');
  const previewLines = lines.slice(0, 10);

  return (
    <motion.div
      variants={cascadeVariants}
      initial="hidden"
      animate="visible"
      custom={0}
      className="hero-card relative overflow-hidden p-6"
    >
      {/* Reading progress bar */}
      <div
        className="absolute top-0 left-0 h-[3px] z-10"
        style={{
          width: `${readProgress}%`,
          background: 'var(--color-accent-primary)',
          boxShadow: '0 0 8px var(--color-accent-primary-glow)',
          transition: 'width 0.1s ease-out',
        }}
      />

      {/* Section header with secondary strip */}
      <div className="section-strip-secondary mb-4 pt-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Megaphone className="h-5 w-5" style={{ color: 'var(--color-accent-secondary)' }} />
            <span
              className="absolute -top-1 -right-1 h-2 w-2 rounded-full animate-pulse"
              style={{ background: 'var(--color-accent-success)' }}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                The Ghost&apos;s Weekly Post-Mortem
              </h3>
              <Badge
                variant="outline"
                className="text-[9px] font-medium"
                style={{
                  borderColor: 'var(--color-accent-secondary)',
                  color: 'var(--color-accent-secondary)',
                  background: 'var(--color-accent-secondary-dim)',
                }}
              >
                Week {report.weekNumber}, {report.year}
              </Badge>
            </div>
            <p className="text-[11px]" style={{ color: 'var(--color-text-dim)' }}>
              {report.participants} grinders · {report.totalXP.toLocaleString()} XP gained
            </p>
          </div>
        </div>
      </div>

      {/* MVP / Lurker quick stats */}
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        custom={0.1}
        className="grid grid-cols-2 gap-3 mb-4"
      >
        {/* MVP card — accent-achievement/gold with glow-achievement */}
        <div
          className="p-3 rounded-lg glow-achievement"
          style={{
            background: `linear-gradient(to right, var(--color-accent-achievement-dim), transparent)`,
            border: `1px solid rgba(251, 191, 36, 0.2)`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-achievement)' }} />
            <span
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: 'var(--color-accent-achievement)' }}
            >
              MVP
            </span>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {report.mvpName || 'N/A'}
          </p>
          <p className="text-xs stat-value" style={{ color: 'var(--color-accent-achievement)' }}>
            +{report.mvpXp.toLocaleString()} XP
          </p>
        </div>

        {/* Lurker card — accent-primary/coral with glow-primary */}
        <div
          className="p-3 rounded-lg glow-primary"
          style={{
            background: `linear-gradient(to right, var(--color-accent-primary-dim), transparent)`,
            border: `1px solid rgba(255, 97, 84, 0.2)`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown className="h-3.5 w-3.5" style={{ color: 'var(--color-accent-primary)' }} />
            <span
              className="text-[10px] uppercase tracking-wider font-medium"
              style={{ color: 'var(--color-accent-primary)' }}
            >
              Lurker
            </span>
          </div>
          <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {report.lurkerName || 'N/A'}
          </p>
          <p className="text-xs stat-value" style={{ color: 'var(--color-accent-primary)' }}>
            +{report.lurkerXp.toLocaleString()} XP
          </p>
        </div>
      </motion.div>

      {/* Report content */}
      <div
        ref={contentRef}
        onScroll={handleScroll}
        className="max-w-none overflow-y-auto"
        style={{ maxHeight: expanded ? '600px' : 'none' }}
      >
        {expanded ? (
          <MarkdownRender text={report.content} />
        ) : (
          <div style={{ opacity: 0.6 }}>
            <MarkdownRender text={previewLines.join('\n')} />
          </div>
        )}
      </div>

      {/* Expand/collapse toggle — accent-secondary color */}
      <motion.button
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        custom={0.2}
        onClick={() => setExpanded(!expanded)}
        className="mt-3 text-xs font-medium transition-colors"
        style={{ color: 'var(--color-accent-secondary)' }}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent-tertiary)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-accent-secondary)')}
      >
        {expanded ? 'Show less' : 'Read full report'}
      </motion.button>

      {/* Mini leaderboard */}
      {report.rankings && report.rankings.length > 0 && (
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="visible"
          custom={0.3}
          className="mt-4 pt-4"
          style={{ borderTop: '1px solid var(--color-border-subtle)' }}
        >
          <p className="stat-label mb-2">Top Grinders This Week</p>
          <div className="space-y-1.5">
            {report.rankings.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span
                  className="w-5 text-right font-mono"
                  style={{
                    color:
                      i === 0
                        ? 'var(--color-accent-achievement)'
                        : i === 1
                        ? 'var(--color-text-primary)'
                        : i === 2
                        ? 'var(--color-accent-achievement)'
                        : 'var(--color-text-dim)',
                  }}
                >
                  {i + 1}
                </span>
                <span className="truncate flex-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {r.name}
                </span>
                <span className="stat-value" style={{ color: 'var(--color-text-muted)' }}>
                  {r.xp.toLocaleString()} XP
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
