"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Trophy, LayoutDashboard, User, Zap } from "lucide-react";

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
    <nav className="sticky top-0 z-50 w-full border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40 transition-shadow">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            <span className="gradient-text">Systemics</span>
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
                  className={`gap-2 text-sm font-medium transition-all ${
                    isActive
                      ? "text-white bg-white/10 hover:bg-white/15"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </Button>
              </Link>
            );
          })}

          <div className="ml-2 pl-2 border-l border-white/[0.08]">
            {mounted ? (
              <>
                <SignedIn>
                  <UserButton 
                    afterSignOutUrl="/"
                    appearance={{
                      elements: {
                        avatarBox: "h-8 w-8 ring-2 ring-purple-500/30 ring-offset-2 ring-offset-[#0a0a0f]",
                      }
                    }}
                  />
                </SignedIn>
                <SignedOut>
                  <Link href="/sign-in">
                    <Button size="sm" className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white border-0 shadow-lg shadow-purple-500/20">
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
    </nav>
  );
}
