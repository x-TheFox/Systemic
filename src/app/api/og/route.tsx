import { ImageResponse } from '@vercel/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');

    if (!handle) {
      return defaultOGImage();
    }

    return profileOGImage(handle);
  } catch (e: any) {
    console.log(`[OG] Error: ${e.message}`);
    return defaultOGImage();
  }
}

async function profileOGImage(handle: string) {
  // Fetch user data — use the request origin or fall back to env
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
  const userRes = await fetch(`${baseUrl}/api/profile?githubHandle=${handle}`);
  
  if (!userRes.ok) {
    return defaultOGImage();
  }

  const { user } = await userRes.json();
  if (!user) return defaultOGImage();

  const topBadges = (user.badges || [])
    .filter((b: any) => b.category !== 'weekly_leaderboard')
      .sort((a: any, b: any) => {
      const order: Record<string, number> = { legendary: 4, epic: 3, rare: 2, common: 1 };
      return (order[b.rarity?.toLowerCase()] || 0) - (order[a.rarity?.toLowerCase()] || 0);
    })
    .slice(0, 3);

  const rarityColor = (r: string) => {
    const map: Record<string, string> = {
      legendary: '#f59e0b',
      epic: '#a855f7',
      rare: '#3b82f6',
      common: '#6b7280',
    };
    return map[r?.toLowerCase()] || '#6b7280';
  };

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0a12 0%, #12121f 50%, #0f0f1a 100%)',
          padding: 48,
          position: 'relative',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28, fontWeight: 800, background: 'linear-gradient(135deg, #c084fc 0%, #22d3ee 100%)', backgroundClip: 'text', color: 'transparent' }}>
              Systemics
            </div>
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
            systemic.app/{handle}
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, marginTop: 40, flex: 1, position: 'relative' }}>
          {/* Avatar circle */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 56,
              fontWeight: 800,
              color: 'white',
              flexShrink: 0,
              boxShadow: '0 0 40px rgba(139,92,246,0.3)',
            }}
          >
            {(user.name || user.email || handle).charAt(0).toUpperCase()}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
            <div style={{ fontSize: 48, fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              {user.name || handle}
            </div>
            {user.title && (
              <div style={{ fontSize: 24, color: '#f59e0b', fontWeight: 600 }}>
                {user.title}
              </div>
            )}
            <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{user.xp?.toLocaleString() || 0}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total XP</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{user.totalCommits || 0}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Commits</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{user.totalPRs || 0}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PRs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Badges */}
        {topBadges.length > 0 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 'auto', position: 'relative' }}>
            {topBadges.map((badge: any) => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${rarityColor(badge.rarity)}40`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: rarityColor(badge.rarity),
                    boxShadow: `0 0 8px ${rarityColor(badge.rarity)}`,
                  }}
                />
                <span style={{ fontSize: 14, color: 'white', fontWeight: 600 }}>{badge.name}</span>
                <span style={{ fontSize: 10, color: rarityColor(badge.rarity), textTransform: 'uppercase', fontWeight: 700 }}>{badge.rarity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function defaultOGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a12 0%, #12121f 50%, #0f0f1a 100%)',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '600px',
            height: '600px',
            background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />
        <div style={{ fontSize: 72, fontWeight: 800, background: 'linear-gradient(135deg, #c084fc 0%, #22d3ee 50%, #f472b6 100%)', backgroundClip: 'text', color: 'transparent', position: 'relative' }}>
          Systemics
        </div>
        <div style={{ fontSize: 24, color: 'rgba(255,255,255,0.5)', marginTop: 16, position: 'relative' }}>
          AI-Augmented Developer Leaderboard
        </div>
        <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', marginTop: 32, position: 'relative', fontFamily: 'monospace' }}>
          Track your grind. Forge your legacy. Join the guild.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
