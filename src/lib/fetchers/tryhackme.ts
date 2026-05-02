interface TryHackMeMetrics {
  points: number;
  rank: number;
  badges: number;
  roomsCompleted: number;
}

export async function fetchTryHackMeMetrics(handle: string): Promise<TryHackMeMetrics> {
  try {
    const response = await fetch(`https://tryhackme.com/api/user/${encodeURIComponent(handle)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Systemics/1.0)',
      },
    });

    if (!response.ok) {
      console.warn(`TryHackMe fetch failed for ${handle}: ${response.status}`);
      return { points: 0, rank: 0, badges: 0, roomsCompleted: 0 };
    }

    const data = await response.json();

    const points = typeof data.points === 'number' ? data.points : 0;
    const rank = typeof data.rank === 'number' ? data.rank : 0;

    const badges = Array.isArray(data.badges) ? data.badges.length : 0;
    const roomsCompleted = typeof data.roomsCompleted === 'number'
      ? data.roomsCompleted
      : (Array.isArray(data.rooms) ? data.rooms.length : 0);

    return { points, rank, badges, roomsCompleted };
  } catch (error) {
    console.warn('TryHackMe fetch failed for', handle, error);
    return { points: 0, rank: 0, badges: 0, roomsCompleted: 0 };
  }
}