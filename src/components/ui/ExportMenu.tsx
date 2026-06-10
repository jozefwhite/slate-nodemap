'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { exportMarkdown, exportViewAsPng } from '@/lib/export';

export default function ExportMenu() {
  const { nodes, edges, path, seedTerm } = useExploration();
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const handleMarkdown = () => {
    exportMarkdown(seedTerm, seedTerm, nodes, edges, path);
    setOpen(false);
  };

  const handleImage = async () => {
    const el = document.getElementById('map-canvas-root');
    if (!el) return;
    setExporting(true);
    try {
      await exportViewAsPng(el, seedTerm || 'nodemap');
    } catch (err) {
      console.error('Image export failed:', err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={nodes.length === 0}
        className="p-1.5 border border-surface-2 text-ink-3 hover:text-ink-0 hover:border-ink-3 disabled:opacity-30 transition-colors"
        title="Export"
      >
        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-surface-2 shadow-md z-50 min-w-[160px]">
          <button
            onClick={handleMarkdown}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-1 hover:bg-surface-1 transition-colors text-left"
          >
            <FileText size={12} className="text-ink-3" />
            markdown (.md)
          </button>
          <button
            onClick={handleImage}
            disabled={exporting}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-ink-1 hover:bg-surface-1 disabled:opacity-50 transition-colors text-left border-t border-surface-1"
          >
            <ImageIcon size={12} className="text-ink-3" />
            image (.png)
          </button>
        </div>
      )}
    </div>
  );
}
