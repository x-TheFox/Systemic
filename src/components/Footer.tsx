"use client";

import Link from "next/link";
import Image from "next/image";
import { Trophy, LayoutDashboard, User, Shield, ExternalLink } from "lucide-react";

function GitHubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

const platforms = [
  { name: "GitHub", href: "https://github.com", icon: GitHubIcon },
  { name: "LeetCode", href: "https://leetcode.com", icon: ExternalLink },
  { name: "Codeforces", href: "https://codeforces.com", icon: Trophy },
  { name: "HackerRank", href: "https://hackerrank.com", icon: ExternalLink },
  { name: "TryHackMe", href: "https://tryhackme.com", icon: Shield },
];

const navLinks = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg overflow-hidden">
                <Image src="/icon.svg" alt="Systemics" width={32} height={32} className="object-contain" />
              </div>
              <span className="text-lg font-bold gradient-text">Systemics</span>
            </Link>
            <p className="text-sm text-white/30 leading-relaxed">
              AI-augmented competitive developer leaderboard. Track your grind, earn badges, unlock skill trees.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <li key={link.href}>
                    <Link href={link.href} className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <Icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Platforms */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-4">Platforms</h3>
            <ul className="space-y-2">
              {platforms.map((p) => {
                const Icon = p.icon;
                return (
                  <li key={p.name}>
                    <a href={p.href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
                      <Icon className="h-3.5 w-3.5" />
                      {p.name}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Features */}
          <div>
            <h3 className="text-xs uppercase tracking-wider text-white/40 font-semibold mb-4">Features</h3>
            <ul className="space-y-2 text-sm text-white/50">
              <li>AI-Forged Badges</li>
              <li>Dynamic Skill Trees</li>
              <li>Weekly Post-Mortems</li>
              <li>Ghost Snapshots</li>
              <li>Deep Dive Archetypes</li>
              <li>Real-time Pulse Feed</li>
              <li>TryHackMe Integration</li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/20">
            Built with dark energy. Powered by Groq AI.
          </p>
          <p className="text-xs text-white/20">
            XP never regresses.
          </p>
        </div>
      </div>
    </footer>
  );
}