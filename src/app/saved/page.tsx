'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Network, LayoutGrid } from 'lucide-react';
import Header from '@/components/layout/Header';
import { createClient } from '@/lib/supabase/client';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { SavedMap } from '@/lib/types';

export default function SavedPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [email, setEmail] = useState('');
  const [authLoading, setAuthLoading] = useState(true);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const { maps, fetchMaps, deleteMap, loadMap } = useMapPersistence();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setAuthLoading(false);
      if (user) fetchMaps();
    };
    checkUser();
  }, [supabase, fetchMaps]);

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/saved`,
      },
    });
    if (!error) setMagicLinkSent(true);
  };

  const handleLoadMap = (map: SavedMap) => {
    loadMap(map);
    router.push('/explore');
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
          // Auth form
          <div className="space-y-6">
            <h1 className="text-sm font-medium text-ink-0">saved maps</h1>
            <p className="text-xs text-ink-2">sign in to save and load your exploration maps.</p>

            {magicLinkSent ? (
              <div className="p-4 bg-surface-1 border border-surface-2">
                <p className="text-xs text-ink-2">check your email for a sign-in link.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your email"
                  className="w-full bg-surface-1 border border-surface-2 text-sm text-ink-1 px-4 py-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors"
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                />
                <button
                  onClick={handleSignIn}
                  disabled={!email.trim()}
                  className="w-full py-3 bg-ink-0 text-white text-sm hover:bg-ink-1 disabled:opacity-30 transition-colors"
                >
                  sign in
                </button>
              </div>
            )}
          </div>
        ) : (
          // Map list
          <div className="space-y-4">
            <h1 className="text-sm font-medium text-ink-0">saved maps</h1>

            {maps.length === 0 ? (
              <p className="text-xs text-ink-3">no saved maps yet. explore something and save it.</p>
            ) : (
              <div className="border border-surface-2">
                {maps.map((map, i) => (
                  <div
                    key={map.id}
                    className={`flex items-center justify-between px-4 py-3 hover:bg-surface-1 cursor-pointer transition-colors group ${
                      i > 0 ? 'border-t border-surface-2' : ''
                    }`}
                    onClick={() => handleLoadMap(map)}
                  >
                    <div className="flex items-center gap-3">
                      {map.view_mode === 'graph' ? (
                        <Network size={14} className="text-ink-3" />
                      ) : (
                        <LayoutGrid size={14} className="text-ink-3" />
                      )}
                      <div>
                        <p className="text-sm text-ink-0">{map.title}</p>
                        <p className="text-2xs text-ink-3">
                          {map.nodes.length} nodes &middot; {formatDate(map.updated_at)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMap(map.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-ink-3 hover:text-red-500 transition-all p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
