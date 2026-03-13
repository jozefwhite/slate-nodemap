import { NextRequest, NextResponse } from 'next/server';
import { searchYouTube } from '@/lib/sources/youtube';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [] });
  }

  const maxResults = Number(request.nextUrl.searchParams.get('maxResults')) || 2;
  const results = await searchYouTube(query, apiKey, maxResults);
  return NextResponse.json({ results });
}
