// HackerRank does not have a well-documented public API for user stats.
// We implement a best-effort scraper/fetcher. If it fails, returns zeros.

interface HackerRankMetrics {
  badges: number;
  stars: number;
  certificates: number;
  contestRating: number;
}

export async function fetchHackerRankMetrics(handle: string): Promise<HackerRankMetrics> {
  try {
    // HackerRank public profile page contains badge data in a script tag
    const response = await fetch(`https://www.hackerrank.com/${handle}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Systemics/1.0)',
      },
    });

    if (!response.ok) {
      return { badges: 0, stars: 0, certificates: 0, contestRating: 0 };
    }

    const html = await response.text();

    // Try to extract badge count from JSON embedded in page
    const badgeMatch = html.match(/"badges"\s*:\s*(\d+)/);
    const starsMatch = html.match(/"stars"\s*:\s*(\d+)/);
    const certificatesMatch = html.match(/"certificates"\s*:\s*(\d+)/);

    // Alternative: look for badge icons count
    const badgeIcons = html.match(/badge-icon/g);
    const badgeCount = badgeIcons ? badgeIcons.length : 0;

    return {
      badges: badgeMatch ? parseInt(badgeMatch[1]) : badgeCount,
      stars: starsMatch ? parseInt(starsMatch[1]) : 0,
      certificates: certificatesMatch ? parseInt(certificatesMatch[1]) : 0,
      contestRating: 0, // Not publicly available
    };
  } catch (error) {
    console.warn('HackerRank fetch failed (expected, no public API):', error);
    return { badges: 0, stars: 0, certificates: 0, contestRating: 0 };
  }
}
