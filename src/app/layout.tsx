import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PageTransition } from "@/components/PageTransition";
import { CommandPalette } from "@/components/CommandPalette";
import "./globals.css";
import { cn } from "@/lib/utils";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Systemics — AI-Augmented Developer Leaderboard",
  description: "Track your grind across GitHub, LeetCode, Codeforces, and HackerRank with AI-generated skill trees, dynamic badges, and weekly reports.",
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("dark", geistSans.variable, geistMono.variable)}>
        <body className="min-h-screen bg-base text-white font-sans flex flex-col">
          <TooltipProvider>
            {/* Ambient background */}
            <div className="fixed inset-0 subtle-grid pointer-events-none opacity-40" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-accent/8 rounded-full blur-[140px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[700px] h-[400px] bg-cyan-500/8 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed top-1/2 left-0 w-[400px] h-[600px] bg-purple-600/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />

            <CommandPalette />
            <Navbar />
            <PageTransition>
              <main className="flex-1 relative z-10">{children}</main>
            </PageTransition>
            <Footer />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'hsl(var(--overlay))',
                  border: '1px solid hsl(var(--border))',
                  color: '#fff',
                  borderRadius: 'var(--radius-standard)',
                  boxShadow: 'var(--z-float-shadow)',
                },
              }}
            />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
