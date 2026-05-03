import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
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
  description: "Track your grind across GitHub, LeetCode, Codeforces, HackerRank, and TryHackMe with AI-generated skill trees, dynamic badges, and weekly reports.",
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
        <body className="min-h-screen bg-[var(--color-base)] text-foreground font-sans flex flex-col antialiased">
          <TooltipProvider>
            {/* Gradient mesh atmosphere */}
            <div className="fixed inset-0 mesh-gradient-primary pointer-events-none opacity-70" />
            <div className="fixed inset-0 subtle-grid pointer-events-none opacity-40" />
            {/* Ambient color blobs */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] pointer-events-none" style={{ background: 'rgba(255,97,84,0.06)' }} />
            <div className="fixed bottom-0 right-0 w-[600px] h-[300px] rounded-full blur-[100px] pointer-events-none" style={{ background: 'rgba(168,85,247,0.05)' }} />
            <div className="fixed bottom-0 left-0 w-[500px] h-[250px] rounded-full blur-[80px] pointer-events-none" style={{ background: 'rgba(34,211,238,0.04)' }} />
            <Navbar />
            <main className="flex-1 relative z-0">{children}</main>
            <Footer />
            <Toaster 
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'var(--color-float)',
                  border: '1px solid var(--color-border-default)',
                  color: 'var(--color-text-primary)',
                  borderRadius: 'var(--radius-standard)',
                },
              }}
            />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
