'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Network, LayoutGrid, Layers, Merge, Check, X, Pencil, Copy, Search, Globe } from 'lucide-react';
import Header from '@/components/layout/Header';
import AuthModal from '@/components/ui/AuthModal';
import Toast from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { useExploration } from '@/hooks/useExploration';
import { mergeMaps } from '@/lib/merge-maps';
import { SavedMap } from '@/lib/types';

export default function SavedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { maps, fetchMaps, deleteMap, loadMap, renameMap, duplicateMap } = useMapPersistence();
  const { setCurrentMapId } = useExploration();

  // Multi-select state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [merging, setMerging] = useState(false);

  // Search + rename state
  const [filter, setFilter] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const visibleMaps = filter.trim()
    ? maps.filter(
        (m) =>
          (m.title || '').toLowerCase().includes(filter.toLowerCase()) ||
          (m.seed_term || '').toLowerCase().includes(filter.toLowerCase())
      )
    : maps;

  const startRename = (map: SavedMap) => {
    setRenamingId(map.id);
    setRenameValue(map.title || '');
  };

  const commitRename = async () => {
    if (!renamingId) return;
    const ok = await renameMap(renamingId, renameValue);
    if (!ok && renameValue.trim()) {
      setToast({ message: 'rename failed', type: 'error' });
    }
    setRenamingId(null);
  };

  const handleDuplicate = async (map: SavedMap) => {
    const copy = await duplicateMap(map);
    setToast(
      copy
        ? { message: 'map duplicated', type: 'success' }
        : { message: 'duplicate failed', type: 'error' }
    );
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
      if (user) fetchMaps();
    };
    checkUser();
  }, [supabase, fetchMaps]);

  const handleAuthSuccess = async () => {
    setShowAuth(false);
    // Re-check user and fetch maps
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
    if (authUser) fetchMaps();
  };

  const handleLoadMap = (map: SavedMap) => {
    if (selectMode) {
      // In select mode, toggle selection instead of loading
      toggleSelect(map.id);
      return;
    }
    loadMap(map);
    router.push('/explore');
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExitSelect = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleMerge = async () => {
    if (selectedIds.size < 2) return;

    setMerging(true);
    try {
      const selectedMaps = maps.filter((m) => selectedIds.has(m.id));
      const titles = selectedMaps.map((m) => m.title || m.seed_term).join(' + ');
      const merged = mergeMaps(selectedMaps);

      // Save the merged map
      // Temporarily set state for the save
      const { loadMap: loadToStore } = useExploration.getState();

      // Create a temporary SavedMap-like structure and save via direct supabase call
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setToast({ message: 'not signed in', type: 'error' });
        return;
      }

      const { data, error } = await supabase
        .from('maps')
        .insert({
          user_id: user.id,
          title: `Merged: ${titles}`,
          seed_term: selectedMaps[0]?.seed_term || 'merged',
          nodes: merged.nodes,
          edges: merged.edges,
          path: merged.path,
          view_mode: 'graph',
        })
        .select()
        .single();

      if (error) {
        console.error('Merge save error:', error);
        setToast({ message: 'merge failed', type: 'error' });
        return;
      }

      // Load the merged map and navigate to explore
      const savedMap = data as SavedMap;
      loadToStore(savedMap);
      setCurrentMapId(savedMap.id);
      setToast({ message: 'maps merged', type: 'success' });
      router.push('/explore');
    } catch (err) {
      console.error('Merge error:', err);
      setToast({ message: 'merge failed', type: 'error' });
    } finally {
      setMerging(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-ink-3">loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-0">
      <Header />

      <div className="flex-1 px-4 py-8 max-w-lg mx-auto w-full">
        {!user ? (
          // Auth prompt
          <div className="space-y-6">
            <h1 className="text-sm font-medium text-ink-0">saved maps</h1>
            <p className="text-xs text-ink-2">sign in to save and load your exploration maps.</p>
            <button
              onClick={() => setShowAuth(true)}
              className="w-full py-3 bg-ink-0 text-white text-sm hover:bg-ink-1 transition-colors"
            >
              sign in
            </button>
          </div>
        ) : (
          // Map list
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-sm font-medium text-ink-0">saved maps</h1>
              <div className="flex items-center gap-2">
                {selectMode ? (
                  <>
                    <button
                      onClick={handleMerge}
                      disabled={selectedIds.size < 2 || merging}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-ink-0 text-white hover:bg-ink-1 disabled:opacity-30 transition-colors"
                    >
                      <Merge size={12} />
                      {merging ? 'merging...' : `merge (${selectedIds.size})`}
                    </button>
                    <button
                      onClick={handleExitSelect}
                      className="p-1.5 text-ink-3 hover:text-ink-0 transition-colors"
                      title="Cancel"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : maps.length >= 2 ? (
                  <button
                    onClick={() => setSelectMode(true)}
                    className="text-2xs font-mono text-ink-3 hover:text-ink-0 transition-colors px-2 py-1 border border-surface-2 hover:border-ink-3"
                  >
                    select to merge
                  </button>
                ) : null}
              </div>
            </div>

            {/* Search filter */}
            {maps.length > 3 && (
              <div className="relative">
                <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="search maps..."
                  className="w-full bg-white border border-surface-2 text-xs text-ink-1 pl-8 pr-3 py-2 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors"
                />
              </div>
            )}

            {maps.length === 0 ? (
              <p className="text-xs text-ink-3">no saved maps yet. explore something and save it.</p>
            ) : visibleMaps.length === 0 ? (
              <p className="text-xs text-ink-3">no maps match &ldquo;{filter}&rdquo;</p>
            ) : (
              <div className="border border-surface-2">
                {visibleMaps.map((map, i) => (
                  <div
                    key={map.id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-surface-1 cursor-pointer transition-colors group ${
                      i > 0 ? 'border-t border-surface-2' : ''
                    } ${selectedIds.has(map.id) ? 'bg-surface-1' : ''}`}
                    onClick={() => renamingId !== map.id && handleLoadMap(map)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {selectMode ? (
                        <div
                          className={`w-4 h-4 border flex items-center justify-center flex-shrink-0 transition-colors ${
                            selectedIds.has(map.id) ? 'bg-ink-0 border-ink-0' : 'border-surface-3'
                          }`}
                        >
                          {selectedIds.has(map.id) && <Check size={12} className="text-white" />}
                        </div>
                      ) : map.view_mode === 'graph' ? (
                        <Network size={14} className="text-ink-3 flex-shrink-0" />
                      ) : map.view_mode === 'journey' ? (
                        <Layers size={14} className="text-ink-3 flex-shrink-0" />
                      ) : (
                        <LayoutGrid size={14} className="text-ink-3 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        {renamingId === map.id ? (
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename();
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                            className="w-full bg-surface-1 border border-surface-3 text-sm text-ink-0 px-2 py-0.5 focus:outline-none focus:border-ink-3"
                          />
                        ) : (
                          <p className="text-sm text-ink-0 truncate flex items-center gap-1.5">
                            {map.title}
                            {map.is_public && (
                              <Globe size={10} className="text-accent flex-shrink-0" />
                            )}
                          </p>
                        )}
                        <p className="text-2xs text-ink-3">
                          {map.nodes.length} nodes &middot; {formatDate(map.updated_at)}
                        </p>
                      </div>
                    </div>
                    {!selectMode && renamingId !== map.id && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(map);
                          }}
                          className="text-ink-3 hover:text-ink-0 transition-colors p-1.5"
                          title="Rename"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(map);
                          }}
                          className="text-ink-3 hover:text-ink-0 transition-colors p-1.5"
                          title="Duplicate"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteMap(map.id);
                          }}
                          className="text-ink-3 hover:text-red-500 transition-colors p-1.5"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {showAuth && <AuthModal onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)} />}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
