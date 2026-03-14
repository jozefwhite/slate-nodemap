'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { useIsMobile } from '@/hooks/useIsMobile';
import { GraphNode, NodeSource } from '@/lib/types';
import DotVortex from '@/components/ui/DotVortex';

/* ── Source colors — matching moodboard/graph ────────────────────── */
const borderColors: Record<NodeSource, string> = {
  wikipedia: 'border-l-node-wikipedia',
  dictionary: 'border-l-node-dictionary',
  wikidata: 'border-l-node-wikidata',
  image: 'border-l-node-image',
  user: 'border-l-node-user',
};

/* ── 3D tuning constants ─────────────────────────────────────────── */
const PERSPECTIVE = 600;
const PERSPECTIVE_ORIGIN = '50% 25%';
const ROTATE_X = 48;
const Z_GAP = -90;
const Y_GAP = -20;
const SCALE_STEP = 0.045;
const BRIGHTNESS_STEP = 0.12;

/* ── Journey Card — matches moodboard card style ─────────────────── */
function JourneyCard({
  node,
  index,
  isMobile,
  onExpand,
  onSelect,
}: {
  node: GraphNode;
  index: number;
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

  const w = isMobile ? 200 : 240;

  return (
    <motion.div
      onClick={handleClick}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        delay: index * 0.05,
      }}
      className={`
        flex-shrink-0 snap-start cursor-pointer group
        bg-white border border-surface-2 border-l-2
        ${borderColors[node.data.source]}
        hover:bg-surface-1 transition-colors
      `}
      style={{ width: w }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Image */}
      {node.data.imageUrl && (
        <div className="aspect-video overflow-hidden bg-surface-1">
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
        <div className="text-xs font-medium text-ink-0 line-clamp-2 mb-1">
          {node.data.label}
        </div>

        {node.data.summary && (
          <div className="text-2xs text-ink-2 line-clamp-3 mb-1.5">
            {node.data.summary}
          </div>
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
            tap to explore →
          </span>
        )}
      </div>
    </motion.div>
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

  // Auto-navigate to deepest layer when a new one appears
  useEffect(() => {
    if (layers.length > 0) {
      setActiveLayerIndex(layers.length - 1);
    }
  }, [layers.length]);

  // Clamp active index if layers shrink
  useEffect(() => {
    if (activeLayerIndex >= layers.length && layers.length > 0) {
      setActiveLayerIndex(layers.length - 1);
    }
  }, [activeLayerIndex, layers.length]);

  // Navigation helpers
  const goUp = useCallback(() => {
    setActiveLayerIndex((prev) => Math.max(0, prev - 1));
  }, []);

  const goDown = useCallback(() => {
    setActiveLayerIndex((prev) => Math.min(layers.length - 1, prev + 1));
  }, [layers.length]);

  // Mouse wheel navigation between layers
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (wheelTimeout.current) return;
      const threshold = 30;
      if (Math.abs(e.deltaY) < threshold) return;

      if (e.deltaY > 0) goDown();
      else goUp();

      wheelTimeout.current = setTimeout(() => {
        wheelTimeout.current = null;
      }, 400);
    },
    [goUp, goDown],
  );

  // Touch swipe navigation
  const touchStart = useRef({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStart.current.x;
    const dy = e.changedTouches[0].clientY - touchStart.current.y;
    if (Math.abs(dy) > Math.abs(dx) * 1.5 && Math.abs(dy) > 50) {
      if (dy < 0) goDown();
      else goUp();
    }
  };

  if (layers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center dot-grid">
        <p className="text-sm text-ink-3">search for something to begin exploring</p>
      </div>
    );
  }

  const activeLayer = layers[activeLayerIndex];

  return (
    <div
      className="h-full overflow-hidden bg-surface-0 relative select-none"
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Animated dot vortex background */}
      <DotVortex />

      {/* ── 3D perspective container ───────────────────────── */}
      <div
        className="h-full w-full relative"
        style={{
          perspective: `${PERSPECTIVE}px`,
          perspectiveOrigin: PERSPECTIVE_ORIGIN,
        }}
      >
        <div
          className="h-full w-full relative"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {layers.map((layer, index) => {
            const depth = index - activeLayerIndex;
            const isBehind = depth < 0;
            const isActive = depth === 0;
            const isAhead = depth > 0;
            const absDepth = Math.abs(depth);

            const rotX = isActive ? 0 : ROTATE_X;
            const z = isActive ? 0 : isBehind ? depth * Z_GAP : 50;
            const y = isActive ? 0 : isBehind ? depth * Y_GAP : 120;
            const scale = isActive ? 1 : Math.max(0.7, 1 - absDepth * SCALE_STEP);
            const opacity = isAhead ? 0 : isActive ? 1 : Math.max(0.3, 1 - absDepth * 0.2);
            const brightness = isActive ? 1 : Math.max(0.4, 1 - absDepth * BRIGHTNESS_STEP);

            return (
              <motion.div
                key={layer.depth}
                className="absolute inset-0"
                animate={{
                  rotateX: rotX,
                  z,
                  y: `${y}%`,
                  scale,
                  opacity,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 180,
                  damping: 24,
                  mass: 0.8,
                }}
                style={{
                  transformStyle: 'preserve-3d',
                  transformOrigin: 'center bottom',
                  zIndex: isActive ? 100 : isBehind ? 50 - absDepth : 0,
                  pointerEvents: isActive ? 'auto' : 'none',
                  filter: `brightness(${brightness})`,
                }}
                onClick={!isActive ? () => setActiveLayerIndex(index) : undefined}
              >
                {/* Layer surface */}
                <div
                  className={`absolute inset-x-4 md:inset-x-8 border border-surface-2 overflow-hidden ${
                    isActive ? 'bg-white' : 'bg-surface-1'
                  }`}
                  style={{
                    top: isMobile ? '18%' : '15%',
                    bottom: 0,
                  }}
                >
                  {/* Layer header bar */}
                  <div className="px-4 py-2.5 flex items-center gap-3 border-b border-surface-2">
                    <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
                      {layer.depth === 0 ? 'origin' : `depth ${layer.depth}`}
                    </span>
                    <div className="w-px h-3 bg-surface-2" />
                    <span className="text-2xs font-mono text-ink-3">
                      {layer.nodes.length} node{layer.nodes.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1" />
                    {isActive && (
                      <span className="text-2xs font-mono text-ink-3">
                        scroll →
                      </span>
                    )}
                  </div>

                  {/* Horizontal card scroll */}
                  <div className="relative h-full">
                    <div
                      className="flex gap-3 overflow-x-auto px-4 py-4 hide-scrollbar h-full items-start"
                      style={{
                        scrollSnapType: 'x mandatory',
                        WebkitOverflowScrolling: 'touch',
                        scrollPadding: '16px',
                      }}
                    >
                      {layer.nodes.map((node, i) => (
                        <JourneyCard
                          key={node.id}
                          node={node}
                          index={i}
                          isMobile={isMobile}
                          onExpand={expand}
                          onSelect={(id) => setActiveNode(id)}
                        />
                      ))}
                      {/* End spacer */}
                      <div className="flex-shrink-0 w-4" />
                    </div>

                    {/* Right edge fade */}
                    <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-white to-transparent pointer-events-none" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Layer navigation UI ────────────────────────────── */}

      {/* Depth indicator — top left */}
      <div className="absolute top-3 left-4 z-50 flex items-center gap-2">
        <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
          {activeLayer?.depth === 0 ? 'origin' : `depth ${activeLayer?.depth}`}
        </span>
        <span className="text-2xs font-mono text-ink-3/50">
          {activeLayerIndex + 1}/{layers.length}
        </span>
      </div>

      {/* Up/Down arrows — right side */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-1">
        <button
          onClick={goUp}
          disabled={activeLayerIndex === 0}
          className="w-7 h-7 border border-surface-2 bg-white text-ink-3 flex items-center justify-center hover:border-ink-3 hover:text-ink-0 disabled:opacity-20 transition-all"
        >
          <ChevronUp size={14} />
        </button>

        {/* Dot indicators */}
        <div className="flex flex-col items-center gap-1.5 py-2">
          {layers.map((layer, index) => (
            <button
              key={layer.depth}
              onClick={() => setActiveLayerIndex(index)}
              className={`transition-all duration-300 ${
                index === activeLayerIndex
                  ? 'w-1.5 h-1.5 bg-ink-0'
                  : 'w-1 h-1 bg-ink-3/30 hover:bg-ink-3'
              }`}
            />
          ))}
        </div>

        <button
          onClick={goDown}
          disabled={activeLayerIndex === layers.length - 1}
          className="w-7 h-7 border border-surface-2 bg-white text-ink-3 flex items-center justify-center hover:border-ink-3 hover:text-ink-0 disabled:opacity-20 transition-all"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {/* Bottom gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-surface-0 to-transparent pointer-events-none z-10" />
    </div>
  );
}
