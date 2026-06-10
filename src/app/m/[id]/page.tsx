import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SavedMap } from '@/lib/types';
import SharedMapView from '@/components/layout/SharedMapView';

interface Props {
  params: { id: string };
}

async function fetchPublicMap(id: string): Promise<SavedMap | null> {
  const supabase = createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('maps')
    .select('*')
    .eq('id', id)
    .eq('is_public', true)
    .single();

  if (error || !data) return null;
  return data as SavedMap;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const map = await fetchPublicMap(params.id);
  if (!map) return { title: 'nodemap' };

  const title = `${map.title || map.seed_term} — nodemap`;
  const description = `An exploration of ${map.seed_term} with ${map.nodes.length} connected ideas. Made with nodemap.`;

  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SharedMapPage({ params }: Props) {
  const map = await fetchPublicMap(params.id);
  if (!map) notFound();

  return <SharedMapView map={map} />;
}
