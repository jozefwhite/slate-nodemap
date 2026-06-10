import { NextRequest, NextResponse } from 'next/server';
import { fetchAssociations } from '@/lib/sources/datamuse';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q');
  if (!query) {
    return NextResponse.json({ error: 'q parameter required' }, { status: 400 });
  }

  const associations = await fetchAssociations(query, 6);
  return NextResponse.json({ associations });
}
