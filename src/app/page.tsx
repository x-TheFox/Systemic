import { SkillRadar } from '@/components/SkillRadar';
import { SkillTree } from '@/components/SkillTree';
import { PulseFeed } from '@/components/PulseFeed';

const MOCK_SKILL_DATA = [
  { subject: 'Frontend', A: 120, fullMark: 150 },
  { subject: 'Backend', A: 98, fullMark: 150 },
  { subject: 'DevOps', A: 86, fullMark: 150 },
  { subject: 'Architecture', A: 99, fullMark: 150 },
  { subject: 'Algo', A: 85, fullMark: 150 },
];

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-950 text-white">
      <h1 className="text-5xl font-bold mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 tracking-wider">
        Systemics
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-6xl">
        <section className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-gray-200">The Pulse</h2>
          <div className="h-[300px] flex items-start justify-center">
            <PulseFeed />
          </div>
        </section>

        <section className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-gray-200">AI Skill Radar</h2>
            <button className="text-xs bg-gray-800 px-3 py-1 rounded-full text-purple-400 hover:text-purple-300 transition-colors">Toggle Ghost Mode</button>
          </div>
          <SkillRadar data={MOCK_SKILL_DATA} />
        </section>
      </div>

      <section className="mt-8 bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-lg w-full max-w-6xl">
        <h2 className="text-2xl font-semibold mb-4 text-gray-200">Tech-Tree Progression</h2>
        <SkillTree />
      </section>
    </main>
  );
}
