import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from '@clerk/nextjs';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/Navbar";
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
  description: "Track your grind across GitHub, LeetCode, Codeforces, and HackerRank with AI-generated skill trees.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={cn("dark", geistSans.variable, geistMono.variable)}>
        <body className="min-h-screen bg-[#0a0a0f] text-white font-sans">
          <TooltipProvider>
            <div className="fixed inset-0 subtle-grid pointer-events-none opacity-50" />
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
            <Navbar />
            {children}
            <Toaster 
              position="bottom-right"
              toastOptions={{
                style: {
                  background: 'rgba(10, 10, 15, 0.95)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#fff',
                },
              }}
            />
          </TooltipProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
