/**
 * Datamuse — free word-association API, no key required.
 * rel_trg ("triggered by") gives lateral, sometimes surprising jumps:
 * cow → milk, brutalism → concrete. ml ("means like") works for phrases.
 */

interface DatamuseWord {
  word: string;
  score: number;
}

const DATAMUSE_BASE = 'https://api.datamuse.com';

async function query(param: string, term: string, count: number): Promise<string[]> {
  const res = await fetch(
    `${DATAMUSE_BASE}/words?${param}=${encodeURIComponent(term)}&max=${count}`,
    { cache: 'no-store' }
  );
  if (!res.ok) return [];
  const words = (await res.json()) as DatamuseWord[];
  return words.map((w) => w.word);
}

export async function fetchAssociations(term: string, max = 6): Promise<string[]> {
  try {
    // rel_trg ("triggered by") gives the most lateral jumps but is spotty
    // for abstract terms — fall back to ml ("means like") when it's dry
    let words = term.includes(' ') ? [] : await query('rel_trg', term, max * 2);
    if (words.length === 0) {
      words = await query('ml', term, max * 2);
    }

    const termLower = term.toLowerCase();
    return words
      // Skip trivial variations of the term itself
      .filter((w) => {
        const lower = w.toLowerCase();
        return (
          lower !== termLower &&
          !termLower.includes(lower) &&
          !lower.includes(termLower) &&
          w.length > 2
        );
      })
      .slice(0, max);
  } catch {
    return [];
  }
}
