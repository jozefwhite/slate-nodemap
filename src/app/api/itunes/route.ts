import { NextRequest, NextResponse } from 'next/server';
import { searchMusic } from '@/lib/sources/itunes';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const results = await searchMusic(query);
  return NextResponse.json({ results });
}
