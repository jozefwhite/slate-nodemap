import { NextRequest, NextResponse } from 'next/server';
import { searchArena } from '@/lib/sources/arena';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const results = await searchArena(query);
  return NextResponse.json(results);
}
