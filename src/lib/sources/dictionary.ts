import { DictionaryEntry } from '@/lib/types';

export async function fetchDefinition(word: string): Promise<DictionaryEntry | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data[0] as DictionaryEntry;
  } catch {
    return null;
  }
}

export function extractRelatedWords(entry: DictionaryEntry): string[] {
  const synonyms = new Set<string>();

  for (const meaning of entry.meanings) {
    for (const syn of meaning.synonyms) {
      synonyms.add(syn.toLowerCase());
    }
    for (const def of meaning.definitions) {
      for (const syn of def.synonyms) {
        synonyms.add(syn.toLowerCase());
      }
    }
  }

  return Array.from(synonyms).slice(0, 6);
}
