'use client';

import { useMemo, useState, useEffect, useRef, CSSProperties } from 'react';
import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { useIsMobile } from '@/hooks/useIsMobile';
import { GraphNode, NodeSource } from '@/lib/types';

/* ── Source color strips ─────────────────────────────────────────── */
const stripeColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
};

/* ── Per-layer 3D transform styles ───────────────────────────────── */
function getLayerStyles(
  offset: number,
  totalLayers: number,
): CSSProperties {
  if (offset === 0) {
    return {
      transform: 'translateZ(0px) translateY(0px) scale(1)',
      opacity: 1,
      zIndex: totalLayers,
      pointerEvents: 'auto',
    };
  }

  if (offset < 0) {
    // Layers behind the active one — recede upward and back
    const abs = Math.abs(offset);
    const z = offset * 60;
    const y = offset * 35;
    const scale = Math.max(0.8, 1 - abs * 0.05);
    const opacity = Math.max(0.25, 1 - abs * 0.25);

    return {
      transform: `translateZ(${z}px) translateY(${y}px) scale(${scale})`,
      opacity,
      zIndex: totalLayers - abs,
      pointerEvents: 'none',
      filter: `blur(${Math.min(abs * 0.5, 2)}px)`,
    };
  }

  // Layers ahead — hidden below
  return {
    transform: 'translateZ(0px) translateY(100%)',
    opacity: 0,
    zIndex: 0,
    pointerEvents: 'none',
  };
}

/* ── Journey Card ────────────────────────────────────────────────── */
function JourneyCard({
  node,
  index,
  isActive,
  isMobile,
  onExpand,
  onSelect,
}: {
  node: GraphNode;
  index: number;
  isActive: boolean;
  isMobile: boolean;
  onExpand: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const handleClick = () => {
    if (!node.data.expanded) {
      onExpand(node.id);
    } else {
      onSelect(node.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`
        flex-shrink-0 snap-start cursor-pointer group
        bg-white border border-surface-2
        transition-all duration-200
        hover:-translate-y-1 hover:shadow-md
        active:scale-[0.98]
        ${isActive ? 'animate-card-stagger' : ''}
      `}
      style={{
        width: isMobile ? 220 : 260,
        animationDelay: isActive ? `${index * 60}ms` : '0ms',
        animationFillMode: 'backwards',
      }}
    >
      {/* Source color strip */}
      <div className={`h-1 ${stripeColors[node.data.source]}`} />

      {/* Image */}
      {node.data.imageUrl && (
        <div
          className="bg-surface-1 overflow-hidden"
          style={{ height: isMobile ? 120 : 140 }}
        >
          <img
            src={node.data.imageUrl}
            alt={node.data.label}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <h3 className="text-xs font-medium text-ink-0 line-clamp-2 mb-1">
          {node.data.label}
        </h3>

        {node.data.summary && (
          <p className="text-2xs text-ink-2 line-clamp-2 mb-2">
            {node.data.summary}
          </p>
        )}

        {node.data.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {node.data.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-2xs font-mono text-ink-3 bg-surface-1 px-1 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {!node.data.expanded && (
          <span className="text-2xs font-mono text-accent mt-2 block">
            tap to explore
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Journey Layer ───────────────────────────────────────────────── */
function JourneyLayer({
  depth,
  nodes,
  offset,
  totalLayers,
  isMobile,
  onActivate,
  onExpand,
  onSelect,
}: {
  depth: number;
  nodes: GraphNode[];
  offset: number;
  totalLayers: number;
  isMobile: boolean;
  onActivate: () => void;
  onExpand: (id: string) => void;
  onSelect: (id: string) => void;
}) {
  const styles = getLayerStyles(offset, totalLayers);
  const isActive = offset === 0;

  return (
    <div
      className="absolute inset-x-0 bottom-0 journey-layer"
      style={{
        ...styles,
        height: isMobile ? '78%' : '72%',
        transformOrigin: 'center bottom',
        transition:
          'transform 0.5s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.5s ease-out, filter 0.5s ease-out',
      }}
      onClick={!isActive ? onActivate : undefined}
    >
      {/* Layer header */}
      <div className="px-4 md:px-6 mb-3 flex items-center gap-2">
        <div className="w-4 h-px bg-ink-3/30" />
        <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
          {depth === 0 ? 'seed' : `depth ${depth}`}
        </span>
        <span className="text-2xs font-mono text-ink-3/50">
          {nodes.length} node{nodes.length !== 1 ? 's' : ''}
        </span>
        <div className="flex-1 h-px bg-ink-3/10" />
      </div>

      {/* Horizontal scroll of cards */}
      <div className="journey-scroll-container">
        <div className="flex gap-3 md:gap-4 overflow-x-auto px-4 md:px-6 pb-4 journey-scroll hide-scrollbar">
          {nodes.map((node, i) => (
            <JourneyCard
              key={node.id}
              node={node}
              index={i}
              isActive={isActive}
              isMobile={isMobile}
              onExpand={onExpand}
              onSelect={onSelect}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main JourneyView ────────────────────────────────────────────── */
export default function JourneyView() {
  const { nodes, setActiveNode } = useExploration();
  const { expand } = useNodeExpand();
  const isMobile = useIsMobile();

  const [activeLayerIndex, setActiveLayerIndex] = useState(0);

  // Group nodes by depth
  const layers = useMemo(() => {
    const depthMap = new Map<number, GraphNode[]>();
    for (const node of nodes) {
      const d = node.data.depth;
      if (!depthMap.has(d)) depthMap.set(d, []);
      depthMap.get(d)!.push(node);
    }
    return Array.from(depthMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([depth, layerNodes]) => ({ depth, nodes: layerNodes }));
  }, [nodes]);

  // Auto-navigate to the deepest layer when a new layer appears
  useEffect(() => {
    if (layers.length > 0) {
      setActiveLayerIndex(layers.length - 1);
    }
  }, [layers.length]);

  // Touch swipe navigation between layers
  const touchStart = useRef({ x: 0, y: 0 });

  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;

    // Only handle as vertical navigation if vertical movement dominates
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 50) {
      if (dy < 0 && activeLayerIndex < layers.length - 1) {
        // Swipe up → go deeper
        setActiveLayerIndex((prev) => prev + 1);
      } else if (dy > 0 && activeLayerIndex > 0) {
        // Swipe down → go back
        setActiveLayerIndex((prev) => prev - 1);
      }
    }
  };

  if (layers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-ink-3">search for something to begin exploring</p>
      </div>
    );
  }

  return (
    <div
      className="h-full overflow-hidden bg-surface-0 journey-container relative"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Depth label */}
      <div className="absolute top-4 left-4 z-50">
        <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
          depth {layers[activeLayerIndex]?.depth ?? 0}
        </span>
        <span className="text-2xs font-mono text-ink-3/50 ml-2">
          {layers[activeLayerIndex]?.nodes.length ?? 0} node
          {(layers[activeLayerIndex]?.nodes.length ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Layer dot indicators — right side */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2">
        {layers.map((layer, index) => (
          <button
            key={layer.depth}
            onClick={() => setActiveLayerIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === activeLayerIndex
                ? 'bg-ink-0 scale-125'
                : 'bg-ink-3/40 hover:bg-ink-3'
            }`}
            title={`Depth ${layer.depth} (${layer.nodes.length} nodes)`}
          />
        ))}
      </div>

      {/* 3D layer stack */}
      <div className="h-full relative" style={{ transformStyle: 'preserve-3d' }}>
        {layers.map((layer, index) => (
          <JourneyLayer
            key={layer.depth}
            depth={layer.depth}
            nodes={layer.nodes}
            offset={index - activeLayerIndex}
            totalLayers={layers.length}
            isMobile={isMobile}
            onActivate={() => setActiveLayerIndex(index)}
            onExpand={expand}
            onSelect={(id) => setActiveNode(id)}
          />
        ))}
      </div>

      {/* Bottom gradient for depth */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface-0/90 to-transparent pointer-events-none z-10" />
    </div>
  );
}
