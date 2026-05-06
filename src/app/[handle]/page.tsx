"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ProfileView } from "@/components/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const RESERVED_HANDLES = new Set([
  "api", "leaderboard", "sign-in", "sign-up", "sso-callback",
  "profile", "compare", "pulse", "duels", "guilds", "hall-of-fame",
  "og", "v1", "webhooks", "badges", "title", "sync", "weekly",
  "deepdive", "ghost", "radar", "skilltree", "inbox",
]);

export default function PublicProfilePage() {
  const params = useParams();
  const handle = params.handle as string;
  const { user: clerkUser, isLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Detect if viewing own profile
  const ownUsername = (clerkUser as any)?.username;
  const isOwnProfile = !!ownUsername && ownUsername.toLowerCase() === handle.toLowerCase();

  useEffect(() => {
    async function loadProfile() {
      if (!handle || RESERVED_HANDLES.has(handle.toLowerCase())) {
        setLoading(false);
        setNotFound(true);
        return;
      }

      try {
        const res = await fetch(`/api/profile?githubHandle=${handle}`, { cache: "no-store" });
        if (!res.ok) {
          if (res.status === 404) {
            setNotFound(true);
          }
          setLoading(false);
          return;
        }
        const data = await res.json();
        setProfile(data.user);
      } catch (err) {
        console.error("Profile load error:", err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [handle]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-[var(--radius-container)]" />
      </main>
    );
  }

  if (notFound || !profile) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-fg-muted gap-4">
        <p className="text-lg">User &quot;{handle}&quot; not found.</p>
        <Link href="/leaderboard">
          <Button variant="outline" className="border-white/10 hover:bg-white/5">
            Browse Leaderboard
          </Button>
        </Link>
      </main>
    );
  }

  return (
    <ProfileView
      profile={profile}
      isOwnProfile={isOwnProfile}
    />
  );
}
