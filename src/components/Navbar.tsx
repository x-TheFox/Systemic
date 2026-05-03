"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { motion } from "framer-motion";
import { Trophy, LayoutDashboard, User } from "lucide-react";
import Image from "next/image";

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
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

          <div className="ml-3 pl-3 border-l border-white/[0.06]">
            {mounted ? (
              <>
                <SignedIn>
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
    </nav>
  );
}
