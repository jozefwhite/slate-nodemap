import { NextRequest, NextResponse } from 'next/server';
import { searchBooks } from '@/lib/sources/openlib';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const results = await searchBooks(query);
  return NextResponse.json({ results });
}
