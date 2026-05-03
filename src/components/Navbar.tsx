"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Trophy, LayoutDashboard, User } from "lucide-react";
import Image from "next/image";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/leaderboard", label: "The Arena", icon: Trophy },
  { href: "/profile", label: "Profile", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="sticky top-0 z-50 w-full border-b border-[var(--color-border-subtle)] bg-[var(--color-surface)]/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-[var(--radius-compact)] overflow-hidden ring-2 ring-[var(--color-accent-primary)]/20 shadow-glow-coral group-hover:ring-[var(--color-accent-primary)]/40 transition-all duration-200">
            <Image src="/icon.svg" alt="Systemics" width={36} height={36} className="object-contain" priority />
          </div>
          <span className="text-xl font-bold tracking-tight gradient-text">
            Systemics
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`gap-2 text-sm font-medium transition-all duration-200 relative ${
                    isActive
                      ? "text-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--color-accent-primary)] rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    />
                  )}
                </Button>
              </Link>
            );
          })}

          <div className="ml-2 pl-2 border-l border-[var(--color-border-subtle)]">
            {mounted ? (
              <>
                <SignedIn>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8 ring-2 ring-[var(--color-accent-primary)]/30 ring-offset-2 ring-offset-[var(--color-surface)]",
                      }
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-in">
                    <Button size="sm" className="bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] hover:opacity-90 text-white border-0 shadow-glow-coral transition-opacity duration-200">
                      Sign In
                    </Button>
                  </Link>
                </SignedOut>
              </>
            ) : (
              <div className="h-8 w-8" />
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
