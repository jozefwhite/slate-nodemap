import { NextRequest, NextResponse } from 'next/server';
import { fetchChannelBlocks } from '@/lib/sources/arena';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ error: 'slug parameter required' }, { status: 400 });
  }

  const blocks = await fetchChannelBlocks(slug, 12);
  return NextResponse.json({ blocks });
}
