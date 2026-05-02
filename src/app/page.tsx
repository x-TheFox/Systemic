import { SkillRadar } from '@/components/SkillRadar';
import { SkillTree } from '@/components/SkillTree';
import { PulseFeed } from '@/components/PulseFeed';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-950 text-white">
      <div className="w-full max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-wider">
            Systemics
          </h1>
          <div className="flex gap-3">
            <Link href="/leaderboard">
              <Button variant="outline" size="sm">Leaderboard</Button>
            </Link>
            <Link href="/profile">
              <Button variant="outline" size="sm">Profile</Button>
            </Link>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* The Pulse */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl text-gray-200">The Pulse</CardTitle>
            </CardHeader>
            <CardContent>
              <PulseFeed />
            </CardContent>
          </Card>

          {/* AI Skill Radar */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-xl text-gray-200">AI Skill Radar</CardTitle>
            </CardHeader>
            <CardContent>
              <SkillRadar />
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard Preview */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl text-gray-200">Leaderboard</CardTitle>
            <Link href="/leaderboard">
              <Button variant="ghost" size="sm" className="text-purple-400">View All</Button>
            </Link>
          </CardHeader>
          <CardContent>
            <LeaderboardTable />
          </CardContent>
        </Card>

        {/* Tech-Tree Progression */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl text-gray-200">Tech-Tree Progression</CardTitle>
          </CardHeader>
          <CardContent>
            <SkillTree />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
