'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useExploration } from './useExploration';
import { SavedMap } from '@/lib/types';

export function useMapPersistence() {
  const [maps, setMaps] = useState<SavedMap[]>([]);
  const [saving, setSaving] = useState(false);
  const { nodes, edges, path, viewMode, seedTerm, currentMapId, setCurrentMapId, reset, loadMap: loadMapToStore } = useExploration();

  const supabase = createClient();

  const saveMap = useCallback(
    async (title?: string) => {
      setSaving(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        // If we're editing an existing map, update it
        if (currentMapId) {
          const { error } = await supabase
            .from('maps')
            .update({ nodes, edges, path, view_mode: viewMode })
            .eq('id', currentMapId);

          if (error) {
            console.error('Update error:', error);
            return null;
          }
          return { id: currentMapId } as SavedMap;
        }

        // Otherwise, create a new map
        const { data, error } = await supabase
          .from('maps')
          .insert({
            user_id: user.id,
            title: title || seedTerm || 'Untitled Map',
            seed_term: seedTerm,
            nodes,
            edges,
            path,
            view_mode: viewMode,
          })
          .select()
          .single();

        if (error) {
          console.error('Save error:', error);
          return null;
        }

        // Track the new map ID so subsequent saves update instead of insert
        setCurrentMapId(data.id);
        return data as SavedMap;
      } finally {
        setSaving(false);
      }
    },
    [supabase, nodes, edges, path, viewMode, seedTerm, currentMapId, setCurrentMapId]
  );

  const updateMap = useCallback(
    async (mapId: string) => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('maps')
          .update({
            nodes,
            edges,
            path,
            view_mode: viewMode,
          })
          .eq('id', mapId);

        if (error) console.error('Update error:', error);
      } finally {
        setSaving(false);
      }
    },
    [supabase, nodes, edges, path, viewMode]
  );

  const fetchMaps = useCallback(async () => {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Fetch error:', error);
      return;
    }
    setMaps((data || []) as SavedMap[]);
  }, [supabase]);

  const deleteMap = useCallback(
    async (mapId: string) => {
      const { error } = await supabase
        .from('maps')
        .delete()
        .eq('id', mapId);

      if (error) {
        console.error('Delete error:', error);
        return;
      }
      setMaps((prev) => prev.filter((m) => m.id !== mapId));
    },
    [supabase]
  );

  const loadMap = useCallback(
    (map: SavedMap) => {
      loadMapToStore(map);
    },
    [loadMapToStore]
  );

  const renameMap = useCallback(
    async (mapId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return false;

      const { error } = await supabase
        .from('maps')
        .update({ title: trimmed })
        .eq('id', mapId);

      if (error) {
        console.error('Rename error:', error);
        return false;
      }
      setMaps((prev) =>
        prev.map((m) => (m.id === mapId ? { ...m, title: trimmed } : m))
      );
      return true;
    },
    [supabase]
  );

  const duplicateMap = useCallback(
    async (map: SavedMap) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('maps')
        .insert({
          user_id: user.id,
          title: `${map.title} (copy)`,
          seed_term: map.seed_term,
          nodes: map.nodes,
          edges: map.edges,
          path: map.path,
          view_mode: map.view_mode,
        })
        .select()
        .single();

      if (error) {
        console.error('Duplicate error:', error);
        return null;
      }
      setMaps((prev) => [data as SavedMap, ...prev]);
      return data as SavedMap;
    },
    [supabase]
  );

  return {
    maps,
    saving,
    saveMap,
    updateMap,
    fetchMaps,
    deleteMap,
    loadMap,
    renameMap,
    duplicateMap,
  };
}
