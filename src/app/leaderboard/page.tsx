"use client";

import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { cascadeVariants, heroCascadeVariants, fadeInUp } from '@/lib/motion';

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* ── Header ── */}
        <motion.div
          variants={cascadeVariants}
          initial="hidden"
          animate="visible"
          custom={0}
          className="flex items-center gap-4"
        >
          <Link href="/">
            <Button
              variant="outline"
              size="icon"
              className="transition-all"
              style={{
                borderColor: 'var(--color-border-default)',
                color: 'var(--color-text-muted)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-primary)';
                e.currentTarget.style.color = 'var(--color-accent-primary)';
                e.currentTarget.style.boxShadow =
                  '0 0 12px var(--color-accent-primary-dim)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.color = 'var(--color-text-muted)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <motion.div
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.1}
            className="flex items-center gap-3"
          >
            <Trophy
              className="h-7 w-7"
              style={{ color: 'var(--color-accent-achievement)' }}
            />
            <h1 className="text-3xl font-bold gradient-text-warm">
              The Arena
            </h1>
          </motion.div>
        </motion.div>

        {/* ── Leaderboard Table ── */}
        <motion.div
          variants={heroCascadeVariants}
          initial="hidden"
          animate="visible"
          className="hero-card mesh-gradient-arena p-6"
        >
          <LeaderboardTable />
        </motion.div>
      </div>
    </main>
  );
}
