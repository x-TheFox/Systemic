"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { staggerItem, pageEntrance } from "@/lib/motion";

const footerLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

const features = [
  "AI-Forged Badges",
  "Dynamic Skill Trees",
  "Weekly Post-Mortems",
  "Ghost Snapshots",
  "Deep Dive Archetypes",
  "Real-time Pulse Feed",
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
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Brand — wider */}
          <motion.div variants={staggerItem} className="md:col-span-5 space-y-3">
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
          <motion.div variants={staggerItem} className="md:col-span-3">
            <h3 className="text-label text-fg-dim mb-3">Navigate</h3>
            <ul className="space-y-1.5">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-fg-muted hover:text-white transition-colors duration-150">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Features */}
          <motion.div variants={staggerItem} className="md:col-span-4">
            <h3 className="text-label text-fg-dim mb-3">Features</h3>
            <ul className="space-y-1.5">
              {features.map((f) => (
                <li key={f} className="text-sm text-fg-muted">{f}</li>
              ))}
            </ul>
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
