interface TryHackMeMetrics {
  points: number;
  rank: number;
  badges: number;
  roomsCompleted: number;
}

export async function fetchTryHackMeMetrics(handle: string): Promise<TryHackMeMetrics> {
  const zeros = { points: 0, rank: 0, badges: 0, roomsCompleted: 0 };

  try {
    const response = await fetch(`https://tryhackme.com/resources/hackers/${encodeURIComponent(handle)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Systemics/1.0)',
        'Accept': 'text/html',
      },
    });

    if (!response.ok) {
      console.warn(`TryHackMe: profile page returned ${response.status} for ${handle}`);
      return zeros;
    }

    const html = await response.text();

    // TryHackMe renders client-side, so we scrape what we can from the HTML
    // Look for patterns like "1,234 points" or "Rank #567" in the rendered content
    let points = 0;
    let rank = 0;
    let roomsCompleted = 0;

    // Points: look for number before "points" keyword
    const pointsMatch = html.match(/([\d,]+)\s*points/i);
    if (pointsMatch) {
      points = parseInt(pointsMatch[1].replace(/,/g, ''), 10) || 0;
    }

    // Rank: look for "Rank #123" or "rank":123
    const rankMatch = html.match(/rank[^a-z]*?(\d+)/i) || html.match(/#(\d+)\s*rank/i);
    if (rankMatch) {
      rank = parseInt(rankMatch[1], 10) || 0;
      // Clamp rank — THM rank is a positive integer (lower is better)
      if (rank > 999999) rank = 0;
    }

    // Rooms completed
    const roomsMatch = html.match(/(\d+)\s*rooms?\s*complet/i);
    if (roomsMatch) {
      roomsCompleted = parseInt(roomsMatch[1], 10) || 0;
    }

    // Badges — count badge-like elements or patterns
    const badgeMatch = html.match(/(\d+)\s*badges?/i);
    let badges = 0;
    if (badgeMatch) {
      badges = parseInt(badgeMatch[1], 10) || 0;
    }

    // If we got nothing meaningful, TryHackMe is client-rendered and stats aren't in HTML
    // Return zeros gracefully — stats will be available once THM adds a public API or
    // the user can manually verify their handle is correct
    if (points === 0 && rank === 0 && badges === 0 && roomsCompleted === 0) {
      // Check if the profile exists at all (valid handle returns 200, invalid redirects)
      const pageContainsHandle = html.toLowerCase().includes(handle.toLowerCase());
      if (!pageContainsHandle) {
        console.warn(`TryHackMe: handle "${handle}" not found on profile page`);
      }
    }

    return { points, rank, badges, roomsCompleted };
  } catch (error) {
    console.warn('TryHackMe fetch failed for', handle, error);
    return zeros;
  }
}