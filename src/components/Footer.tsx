"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { staggerItem, pageEntrance } from "@/lib/motion";

const footerLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
  { href: "/duels", label: "Duels" },
  { href: "/guilds", label: "Guilds" },
  { href: "/pulse", label: "Pulse" },
  { href: "/compare", label: "Compare" },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.05] bg-base/60 backdrop-blur-2xl mt-auto relative z-10">
      <motion.div
        variants={pageEntrance}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="mx-auto max-w-7xl px-4 sm:px-6 py-10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          {/* Brand */}
          <motion.div variants={staggerItem} className="space-y-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative flex h-7 w-7 items-center justify-center rounded-[var(--radius-compact)] overflow-hidden">
                <Image src="/icon.svg" alt="Systemics" width={28} height={28} className="object-contain" />
              </div>
              <span className="text-base font-bold gradient-text">Systemics</span>
            </Link>
            <p className="text-sm text-fg-muted leading-relaxed max-w-sm">
              AI-augmented competitive developer progression. Track your grind, earn thrones, unlock skill trees.
            </p>
          </motion.div>

          {/* Navigation */}
          <motion.div variants={staggerItem} className="flex flex-wrap gap-x-5 gap-y-2 md:justify-end">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-fg-muted hover:text-white transition-colors duration-150"
              >
                {link.label}
              </Link>
            ))}
          </motion.div>
        </div>

        <div className="mt-8 pt-5 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-fg-muted">
            Built with rage, caffeine, and a relentless pursuit of XP. &copy;{' '}
            <a href="https://www.edencorp.org/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              EdenCORP
            </a>{' '}
            {new Date().getFullYear()}
          </p>
          <p className="text-xs text-fg-muted font-mono">
            XP never regresses.
          </p>
        </div>
      </motion.div>
    </footer>
  );
}
