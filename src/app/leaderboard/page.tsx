import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon" className="border-white/10 hover:bg-white/5">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-400" />
            <h1 className="text-3xl font-bold gradient-text">Leaderboard</h1>
          </div>
        </div>

        <div className="glass-card p-6">
          <LeaderboardTable />
        </div>
      </div>
    </main>
  );
}