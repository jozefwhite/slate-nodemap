'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConceptNodeData, NodeSource } from '@/lib/types';

const sourceColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
  arena: 'bg-node-arena',
};

function ImageNodeComponent({ data, selected }: NodeProps<ConceptNodeData>) {
  return (
    <div
      className={`
        animate-node-appear
        w-[180px] h-[200px] bg-white border border-surface-2
        group cursor-pointer overflow-hidden
        transition-all duration-150
        hover:-translate-y-0.5 hover:shadow-sm
        ${selected ? 'border-ink-3 shadow-md' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />

      <div className="h-[140px] bg-surface-1 overflow-hidden">
        {data.imageUrl ? (
          <img
            src={data.imageUrl}
            alt={data.label}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-3 text-2xs font-mono">
            NO IMAGE
          </div>
        )}
      </div>

      <div className="px-2 py-1.5 flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 flex-shrink-0 ${sourceColors[data.source]}`} />
        <span className="text-xs text-ink-1 truncate">{data.label}</span>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />
    </div>
  );
}

export default memo(ImageNodeComponent);
