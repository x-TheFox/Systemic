"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    githubHandle: '',
    leetcodeHandle: '',
    codeforcesHandle: '',
    hackerrankHandle: '',
    name: '',
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) throw new Error('Failed to load');
        const data = await res.json();
        setProfile(data.user);
        setFormData({
          githubHandle: data.user.githubHandle || '',
          leetcodeHandle: data.user.leetcodeHandle || '',
          codeforcesHandle: data.user.codeforcesHandle || '',
          hackerrankHandle: data.user.hackerrankHandle || '',
          name: data.user.name || '',
        });
      } catch {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    if (isLoaded) loadProfile();
  }, [isLoaded]);

  async function handleSave() {
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error('Failed to save');
      
      const data = await res.json();
      setProfile(data.user);
      setEditing(false);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to save profile');
    }
  }

  if (!isLoaded || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950">
        <Skeleton className="w-96 h-96" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <p>Please sign in to view your profile.</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-950 text-white">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Profile
          </h1>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-gray-200">Platform Handles</CardTitle>
              <Button variant="outline" size="sm" onClick={() => editing ? handleSave() : setEditing(true)}>
                {editing ? 'Save' : 'Edit'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <>
                <div>
                  <label className="text-sm text-gray-400">Display Name</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">GitHub</label>
                  <Input
                    value={formData.githubHandle}
                    onChange={(e) => setFormData({ ...formData, githubHandle: e.target.value })}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">LeetCode</label>
                  <Input
                    value={formData.leetcodeHandle}
                    onChange={(e) => setFormData({ ...formData, leetcodeHandle: e.target.value })}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">Codeforces</label>
                  <Input
                    value={formData.codeforcesHandle}
                    onChange={(e) => setFormData({ ...formData, codeforcesHandle: e.target.value })}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-400">HackerRank</label>
                  <Input
                    value={formData.hackerrankHandle}
                    onChange={(e) => setFormData({ ...formData, hackerrankHandle: e.target.value })}
                    className="bg-gray-800 border-gray-700 mt-1"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span>{profile?.name || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">GitHub</span>
                  <span>{profile?.githubHandle || 'Not linked'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">LeetCode</span>
                  <span>{profile?.leetcodeHandle || 'Not linked'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Codeforces</span>
                  <span>{profile?.codeforcesHandle || 'Not linked'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">HackerRank</span>
                  <span>{profile?.hackerrankHandle || 'Not linked'}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-200">Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total XP" value={profile?.xp || 0} />
              <StatCard label="Commits" value={profile?.totalCommits || 0} />
              <StatCard label="PRs" value={profile?.totalPRs || 0} />
              <StatCard label="LeetCode Hard" value={profile?.leetcodeHard || 0} />
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        {profile?.achievements?.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-gray-200">Achievements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.achievements.map((ach: any) => (
                <div key={ach.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                  <Badge variant="outline">🏆</Badge>
                  <div>
                    <p className="text-sm font-medium">{ach.title}</p>
                    <p className="text-xs text-gray-400">{ach.description}</p>
                  </div>
                  {ach.xpBonus > 0 && (
                    <span className="ml-auto text-purple-400 text-xs">+{ach.xpBonus} XP</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-gray-800 p-4 rounded-lg text-center">
      <div className="text-2xl font-bold text-purple-400">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}
