'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Save, FilePlus, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useExploration } from '@/hooks/useExploration';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { GraphNode } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';
import Header from '@/components/layout/Header';
import SearchInput from '@/components/ui/SearchInput';
import ViewToggle from '@/components/ui/ViewToggle';
import PathBreadcrumb from '@/components/ui/PathBreadcrumb';
import NodePanel from '@/components/ui/NodePanel';
import MoodboardGrid from '@/components/layout/MoodboardGrid';
import JourneyView from '@/components/layout/JourneyView';
import CaptureModal from '@/components/ui/CaptureModal';
import AuthModal from '@/components/ui/AuthModal';
import Toast from '@/components/ui/Toast';
import MiniPlayer from '@/components/ui/MiniPlayer';
import { createClient } from '@/lib/supabase/client';

const Canvas = dynamic(() => import('@/components/graph/Canvas'), { ssr: false });

// Loading messages that cycle
const loadingMessages = [
  'searching knowledge bases...',
  'finding connections...',
  'building your starting point...',
  'mapping the territory...',
];

function LoadingScreen({ seedTerm }: { seedTerm: string }) {
  const [msgIndex, setMsgIndex] = useState(0);

  // Cycle through messages
  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % loadingMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full dot-grid flex flex-col items-center justify-center gap-6">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 bg-ink-0 animate-pulse-subtle" />
        <span className="text-sm font-medium text-ink-0">{seedTerm}</span>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-ink-3"
            style={{
              animation: `pulse-subtle 1.4s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>

      <p className="text-xs text-ink-3 font-mono animate-fade-in" key={msgIndex}>
        {loadingMessages[msgIndex]}
      </p>
    </div>
  );
}

export default function ExplorePage() {
  const router = useRouter();
  const { nodes, isLoading, seedTerm, activeNodeId, viewMode, reset, mapStack, popMap, loadMap } = useExploration();
  const [showCapture, setShowCapture] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const { saveMap, saving } = useMapPersistence();
  const isMobile = useIsMobile();
  const supabase = createClient();

  const answerCount = nodes.reduce(
    (sum: number, n: GraphNode) => sum + n.data.conversations.filter((c) => c.approved).length,
    0
  );

  const doSave = useCallback(async () => {
    const result = await saveMap();
    if (result) {
      setToast({ message: 'map saved', type: 'success' });
    } else {
      setToast({ message: 'save failed', type: 'error' });
    }
  }, [saveMap]);

  const handleSave = useCallback(async () => {
    // Check auth first — show modal if not signed in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      doSave();
    } else {
      setShowAuth(true);
    }
  }, [supabase, doSave]);

  const handleAuthSuccess = useCallback(() => {
    setShowAuth(false);
    // Auto-save after successful auth
    doSave();
  }, [doSave]);

  const handleNewMap = useCallback(() => {
    if (nodes.length > 0) {
      const confirmed = window.confirm(
        'Start a new map? Any unsaved changes will be lost.'
      );
      if (!confirmed) return;
    }
    reset();
    router.push('/');
  }, [nodes.length, reset, router]);

  const handleBackMap = useCallback(async () => {
    const prev = popMap();
    if (!prev || prev.mapId === 'unsaved') return;

    // Load the previous map from Supabase
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('id', prev.mapId)
        .single();

      if (!error && data) {
        loadMap(data);
      }
    } catch {
      setToast({ message: 'failed to load previous map', type: 'error' });
    }
  }, [popMap, loadMap, supabase]);

  // Show loading screen when search is in progress and no nodes exist yet
  const showLoading = isLoading && nodes.length === 0 && seedTerm;

  return (
    <div className="h-screen flex flex-col">
      <Header />

      {/* Toolbar — hidden on mobile */}
      {!isMobile && (
        <div className="h-10 border-b border-surface-2 bg-white flex items-center px-4 gap-2">
          {mapStack.length > 0 && (
            <button
              onClick={handleBackMap}
              className="flex items-center gap-1 text-xs text-ink-3 hover:text-ink-0 transition-colors px-2 py-1 border border-surface-2 hover:border-ink-3"
              title="Back to previous map"
            >
              <ArrowLeft size={12} />
              back
            </button>
          )}
          <SearchInput compact onSearch={() => {}} />
          <ViewToggle />
          <button
            onClick={() => setShowCapture(true)}
            className="p-1.5 border border-surface-2 text-ink-3 hover:text-ink-0 hover:border-ink-3 transition-colors"
            title="Capture"
          >
            <Plus size={14} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving || nodes.length === 0}
            className="p-1.5 border border-surface-2 text-ink-3 hover:text-ink-0 hover:border-ink-3 disabled:opacity-30 transition-colors"
            title="Save map"
          >
            <Save size={14} />
          </button>
          <button
            onClick={handleNewMap}
            className="p-1.5 border border-surface-2 text-ink-3 hover:text-ink-0 hover:border-ink-3 transition-colors"
            title="New map"
          >
            <FilePlus size={14} />
          </button>
          {isLoading && nodes.length > 0 && (
            <span className="text-2xs font-mono text-ink-3 animate-pulse-subtle">
              expanding...
            </span>
          )}
        </div>
      )}

      {/* Mobile compact toolbar */}
      {isMobile && (
        <div className="h-10 border-b border-surface-2 bg-white flex items-center px-3 gap-2">
          <SearchInput compact onSearch={() => {}} />
          <ViewToggle />
          {isLoading && nodes.length > 0 && (
            <span className="text-2xs font-mono text-ink-3 animate-pulse-subtle flex-shrink-0">
              expanding...
            </span>
          )}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 relative overflow-hidden">
        {showLoading ? (
          <LoadingScreen seedTerm={seedTerm} />
        ) : nodes.length === 0 ? (
          <div className="w-full h-full dot-grid flex items-center justify-center">
            <p className="text-sm text-ink-3">
              search for something to begin exploring
            </p>
          </div>
        ) : viewMode === 'graph' ? (
          <Canvas />
        ) : viewMode === 'journey' ? (
          <JourneyView />
        ) : (
          <MoodboardGrid />
        )}

        {/* Node Panel */}
        {activeNodeId && <NodePanel />}
      </div>

      {/* Path breadcrumb — hidden on mobile */}
      {!isMobile && <PathBreadcrumb />}

      {/* Persistent mini player */}
      <MiniPlayer />

      {/* Stats bar */}
      {!isMobile ? (
        <div className="h-8 border-t border-surface-2 bg-white flex items-center justify-between px-4">
          <span className="text-2xs font-mono text-ink-3">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
          <span className="text-2xs font-mono text-ink-3">
            {answerCount} answer{answerCount !== 1 ? 's' : ''} saved
          </span>
          {seedTerm && (
            <span className="text-2xs font-mono text-ink-3">{seedTerm}</span>
          )}
        </div>
      ) : nodes.length > 0 ? (
        /* Mobile: minimal stats */
        <div className="h-7 border-t border-surface-2 bg-white flex items-center justify-center px-4">
          <span className="text-2xs font-mono text-ink-3">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
            {seedTerm ? ` · ${seedTerm}` : ''}
          </span>
        </div>
      ) : null}

      {/* Mobile FAB — capture button */}
      {isMobile && nodes.length > 0 && !activeNodeId && (
        <button
          onClick={() => setShowCapture(true)}
          className="fixed bottom-16 right-4 z-30 w-12 h-12 rounded-full bg-ink-0 text-white shadow-lg flex items-center justify-center active:bg-ink-1 transition-colors"
          title="Capture"
        >
          <Plus size={20} />
        </button>
      )}

      {/* Capture Modal */}
      {showCapture && <CaptureModal onClose={() => setShowCapture(false)} />}

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
