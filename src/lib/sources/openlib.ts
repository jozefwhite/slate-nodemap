import { BookResult } from '@/lib/types';

export async function searchBooks(query: string, limit = 3): Promise<BookResult[]> {
  try {
    const url = new URL('https://openlibrary.org/search.json');
    url.searchParams.set('q', query);
    url.searchParams.set('fields', 'key,title,author_name,cover_i,first_publish_year');
    url.searchParams.set('limit', String(limit));

    const res = await fetch(url.toString(), {
      cache: 'no-store',
      headers: { 'User-Agent': 'nodemap/0.1' },
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.docs || []).map((doc: Record<string, unknown>) => ({
      title: doc.title || '',
      authors: (doc.author_name as string[]) || [],
      coverUrl: doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
        : null,
      firstPublishYear: (doc.first_publish_year as number) || null,
      key: doc.key || '',
    }));
  } catch {
    return [];
  }
}
