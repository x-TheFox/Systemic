import { LeaderboardTable } from '@/components/LeaderboardTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LeaderboardPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8 bg-gray-950 text-white">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
            Leaderboard
          </h1>
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-200">Global Rankings</CardTitle>
          </CardHeader>
          <CardContent>
            <LeaderboardTable />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
