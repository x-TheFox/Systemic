"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!isLoaded) return;

      if (!clerkUser) {
        setLoading(false);
        return;
      }

      const username = (clerkUser as any)?.username;
      if (username) {
        router.replace(`/${username}`);
        return;
      }

      try {
        const res = await fetch(`/api/profile?clerkId=${clerkUser.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setProfile(data.user);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [isLoaded, clerkUser, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Skeleton className="w-96 h-96 rounded-[var(--radius-container)]" />
      </main>
    );
  }

  if (!clerkUser) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center text-fg-muted gap-4">
        <p>Please sign in to view your profile.</p>
      </main>
    );
  }

  return (
    <ProfileView
      profile={profile}
      isOwnProfile={true}
    />
  );
}
