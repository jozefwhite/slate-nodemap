import { NextRequest, NextResponse } from 'next/server';
import { fetchDefinition, extractRelatedWords } from '@/lib/sources/dictionary';

export async function GET(request: NextRequest) {
  const word = request.nextUrl.searchParams.get('word');
  if (!word) {
    return NextResponse.json({ error: 'word parameter required' }, { status: 400 });
  }

  const entry = await fetchDefinition(word);
  if (!entry) {
    return NextResponse.json({ entry: null, relatedWords: [] });
  }

  const relatedWords = extractRelatedWords(entry);

  return NextResponse.json({ entry, relatedWords });
}
