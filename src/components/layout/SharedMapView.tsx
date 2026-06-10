'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, X } from 'lucide-react';
import { SavedMap, GraphNode, NodeSource } from '@/lib/types';

const borderColors: Record<NodeSource, string> = {
  wikipedia: 'border-l-node-wikipedia',
  dictionary: 'border-l-node-dictionary',
  wikidata: 'border-l-node-wikidata',
  image: 'border-l-node-image',
  user: 'border-l-node-user',
  arena: 'border-l-node-arena',
};

/* Read-only detail overlay for a single node */
function NodeDetail({ node, onClose }: { node: GraphNode; onClose: () => void }) {
  const approved = node.data.conversations.filter((c) => c.approved);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white border border-surface-2 w-full max-w-md max-h-[85vh] overflow-y-auto md:mx-4">
        <div className="sticky top-0 bg-white border-b border-surface-2 px-4 py-3 flex items-start justify-between gap-2">
          <div>
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
              {node.data.source}
            </span>
            <h2 className="text-sm font-medium text-ink-0">{node.data.label}</h2>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink-0 p-1">
            <X size={16} />
          </button>
        </div>

        {node.data.imageUrl && (
          <div className="aspect-video bg-surface-1 overflow-hidden">
            <img src={node.data.imageUrl} alt={node.data.label} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="px-4 py-3 space-y-3">
          {node.data.summary && (
            <p className="text-xs text-ink-1 leading-relaxed">{node.data.summary}</p>
          )}

          {node.data.url && (
            <a
              href={node.data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
            >
              source <ArrowUpRight size={10} />
            </a>
          )}

          {approved.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-surface-2">
              <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">notes</span>
              {approved.map((qa) => (
                <div key={qa.id} className="space-y-1">
                  <p className="text-xs font-medium text-ink-0">{qa.question}</p>
                  <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-line">
                    {qa.answer.replace(/\[\[([^\]]+)\]\]/g, '$1')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SharedMapView({ map }: { map: SavedMap }) {
  const [activeNode, setActiveNode] = useState<GraphNode | null>(null);

  // Group by depth so the layout reads as a journey
  const layers = useMemo(() => {
    const byDepth = new Map<number, GraphNode[]>();
    for (const node of map.nodes) {
      const d = node.data.depth;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(node);
    }
    return Array.from(byDepth.entries())
      .sort(([a], [b]) => a - b)
      .map(([depth, nodes]) => ({ depth, nodes }));
  }, [map.nodes]);

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Header */}
      <header className="h-12 border-b border-surface-2 bg-white flex items-center justify-between px-4 sticky top-0 z-40">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-3 h-3 bg-ink-0" />
          <span className="text-sm font-medium text-ink-0">nodemap</span>
        </Link>
        <Link
          href="/"
          className="text-xs font-mono uppercase tracking-wider text-ink-3 hover:text-ink-0 transition-colors"
        >
          start your own →
        </Link>
      </header>

      {/* Title */}
      <div className="px-4 md:px-8 py-6 border-b border-surface-2 bg-white">
        <h1 className="text-lg font-medium text-ink-0">{map.title || map.seed_term}</h1>
        <p className="text-2xs font-mono text-ink-3 mt-1">
          {map.nodes.length} nodes · shared exploration · read-only
        </p>
      </div>

      {/* Layers */}
      <div className="px-4 md:px-8 py-6 space-y-8 dot-grid">
        {layers.map((layer) => (
          <div key={layer.depth}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
                {layer.depth === 0 ? 'origin' : `depth ${layer.depth}`}
              </span>
              <span className="text-2xs font-mono text-ink-3/50">
                {layer.nodes.length} node{layer.nodes.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {layer.nodes.map((node) => (
                <div
                  key={node.id}
                  onClick={() => setActiveNode(node)}
                  className={`bg-white border border-surface-2 border-l-2 ${borderColors[node.data.source]} p-3 cursor-pointer hover:bg-surface-1 transition-colors`}
                >
                  {node.data.imageUrl && (
                    <div className="aspect-video mb-2 overflow-hidden bg-surface-1">
                      <img
                        src={node.data.imageUrl}
                        alt={node.data.label}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="text-xs font-medium text-ink-0 line-clamp-2 mb-1">
                    {node.data.label}
                  </div>
                  {node.data.summary && (
                    <div className="text-2xs text-ink-2 line-clamp-3">{node.data.summary}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="px-4 py-10 text-center border-t border-surface-2 bg-white">
        <p className="text-xs text-ink-2 mb-4">made with nodemap — start with anything, watch it branch.</p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 bg-ink-0 text-white text-sm hover:bg-ink-1 transition-colors"
        >
          explore your own
        </Link>
      </div>

      {/* Node detail overlay */}
      {activeNode && <NodeDetail node={activeNode} onClose={() => setActiveNode(null)} />}
    </div>
  );
}
