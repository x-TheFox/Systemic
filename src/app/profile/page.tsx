"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ProfileView } from "@/components/ProfileView";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user: clerkUser, isLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    githubHandle: "",
    leetcodeHandle: "",
    codeforcesHandle: "",
    hackerrankHandle: "",
    name: "",
  });

  useEffect(() => {
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

    async function loadProfile() {
      if (!clerkUser) return;
      try {
        const res = await fetch(`/api/profile?clerkId=${clerkUser.id}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        setProfile(data.user);
        setFormData({
          githubHandle: data.user.githubHandle || "",
          leetcodeHandle: data.user.leetcodeHandle || "",
          codeforcesHandle: data.user.codeforcesHandle || "",
          hackerrankHandle: data.user.hackerrankHandle || "",
          name: data.user.name || "",
        });
      } catch (err) {
        console.error("Profile load error:", err);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [isLoaded, clerkUser, router]);

  async function handleSave() {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to save");
      const data = await res.json();
      setProfile(data.user);
      setEditing(false);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save profile");
    }
  }

  async function triggerSync() {
    toast.info("Sync triggered in the background. Check back in a minute!");
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}` },
      });
      if (!res.ok) throw new Error("Sync failed");
      toast.success("Sync complete! Refresh to see changes.");
    } catch {
      toast.error("Sync failed. Try again later.");
    }
  }

  async function triggerDeepDive() {
    toast.info("Deep dive started. Analyzing your entire GitHub history...");
    try {
      const res = await fetch("/api/deepdive", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: profile?.id }),
      });
      if (!res.ok) throw new Error("Deep dive failed");
      const data = await res.json();
      toast.success(`Deep dive complete! Archetype: ${data.archetype}`);
    } catch {
      toast.error("Deep dive failed. Try again later.");
    }
  }

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
      editing={editing}
      formData={formData}
      setFormData={setFormData}
      onEdit={() => setEditing(true)}
      onSave={handleSave}
      onSync={triggerSync}
      onDeepDive={triggerDeepDive}
    />
  );
}
