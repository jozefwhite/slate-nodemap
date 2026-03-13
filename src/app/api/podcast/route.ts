import { NextRequest, NextResponse } from 'next/server';
import { searchPodcasts } from '@/lib/sources/podcast';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const apiKey = process.env.PODCAST_INDEX_KEY;
  const apiSecret = process.env.PODCAST_INDEX_SECRET;
  if (!apiKey || !apiSecret) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchPodcasts(query, apiKey, apiSecret);
  return NextResponse.json({ results });
}
