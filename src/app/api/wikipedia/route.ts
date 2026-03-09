import { NextRequest, NextResponse } from 'next/server';
import { fetchSummary, fetchLinks, fetchIntro, searchWikipedia } from '@/lib/sources/wikipedia';

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get('title');
  if (!title) {
    return NextResponse.json({ error: 'title parameter required' }, { status: 400 });
  }

  // Always do fuzzy search first — it handles typos and finds the best match
  const search = await searchWikipedia(title);
  const bestTitle = search.titles.length > 0 ? search.titles[0] : title;

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
