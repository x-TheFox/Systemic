export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function duckduckgoSearch(query: string, maxResults: number = 5): Promise<SearchResult[]> {
  // Use DuckDuckGo HTML search
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      console.warn(`[DDG] Search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const results: SearchResult[] = [];

    // Parse results from DDG HTML
    // DDG HTML format: each result is in a .result div (class may include results_links_deep web-result)
    const resultBlocks = html.split(/<div\s+class="result\s+[^"]*">/);

    for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
      const block = resultBlocks[i];

      // Extract title and URL
      const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
      if (titleMatch) {
        let resultUrl = titleMatch[1];
        // DDG sometimes redirects through their own URL
        if (resultUrl.startsWith('//')) resultUrl = 'https:' + resultUrl;

        const title = titleMatch[2].replace(/<[^>]+>/g, '').trim();

        // Extract snippet
        const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
        const snippet = snippetMatch
          ? snippetMatch[1].replace(/<[^>]+>/g, '').trim()
          : '';

        if (title && resultUrl) {
          results.push({ title, url: resultUrl, snippet });
        }
      }
    }

    return results;
  } catch (err) {
    console.error('[DDG] Search error:', err);
    return [];
  }
}
