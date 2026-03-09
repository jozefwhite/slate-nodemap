import { NextRequest, NextResponse } from 'next/server';
import { fetchSummary, fetchLinks, fetchIntro, searchWikipedia } from '@/lib/sources/wikipedia';

// Strip accents for fuzzy comparison
function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Pick the search result whose title contains the most words from the query
function bestMatch(query: string, titles: string[]): string {
  const queryWords = normalize(query).replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  let best = titles[0];
  let bestScore = 0;

  for (const title of titles) {
    const titleNorm = normalize(title);
    let score = 0;
    for (const word of queryWords) {
      if (titleNorm.includes(word)) score++;
    }
    // Prefer titles that match more query words
    if (score > bestScore) {
      bestScore = score;
      best = title;
    }
  }

  return best;
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title');
  if (!title) {
    return NextResponse.json({ error: 'title parameter required' }, { status: 400 });
  }

  // Always do fuzzy search first — it handles typos and finds the best match
  const search = await searchWikipedia(title);
  const bestTitle = search.titles.length > 0 ? bestMatch(title, search.titles) : title;

  const [summary, links] = await Promise.all([
    fetchSummary(bestTitle),
    fetchLinks(bestTitle),
  ]);

  // Fetch the full intro section for the resolved title
  let intro: string | null = null;
  if (summary?.title) {
    intro = await fetchIntro(summary.title);
  }

  return NextResponse.json({ summary, links, intro });
}
