'use client';

import { useState } from 'react';
import { Share2, Loader2 } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { createClient } from '@/lib/supabase/client';

interface ShareButtonProps {
  onToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function ShareButton({ onToast }: ShareButtonProps) {
  const { nodes, currentMapId } = useExploration();
  const [sharing, setSharing] = useState(false);
  const supabase = createClient();

  const handleShare = async () => {
    if (!currentMapId) {
      onToast('save your map first to share it', 'info');
      return;
    }

    setSharing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        onToast('sign in to share', 'info');
        return;
      }

      const { error } = await supabase
        .from('maps')
        .update({ is_public: true })
        .eq('id', currentMapId);

      if (error) {
        console.error('Share error:', error);
        onToast('sharing failed', 'error');
        return;
      }

      const url = `${window.location.origin}/m/${currentMapId}`;
      await navigator.clipboard.writeText(url);
      onToast('public link copied', 'success');
    } catch (err) {
      console.error('Share error:', err);
      onToast('sharing failed', 'error');
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing || nodes.length === 0}
      className="p-1.5 border border-surface-2 text-ink-3 hover:text-ink-0 hover:border-ink-3 disabled:opacity-30 transition-colors"
      title="Share public link"
    >
      {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
    </button>
  );
}
