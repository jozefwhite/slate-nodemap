'use client';

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { ConceptNodeData, NodeSource } from '@/lib/types';
import { useIsMobile } from '@/hooks/useIsMobile';

const sourceColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
};

function ConceptNodeComponent({ data, selected }: NodeProps<ConceptNodeData>) {
  const approvedCount = data.conversations.filter((c) => c.approved).length;
  const isMobile = useIsMobile();
  const isRoot = data.depth === 0;
  const hasImage = !!data.imageUrl;

  const labelLen = data.label.length;
  const textClass = isRoot
    ? 'text-xs'
    : labelLen <= 14
      ? 'text-xs'
      : 'text-2xs';

  // Fixed width when image present for consistent banner; flexible otherwise
  const widthClass = hasImage
    ? (isRoot ? 'w-[200px]' : 'w-[160px]')
    : (isRoot ? 'min-w-[100px] max-w-[220px]' : 'min-w-[80px] max-w-[180px]');

  return (
    <div
      className={`
        animate-node-appear
        ${widthClass}
        bg-white border overflow-hidden
        ${isRoot && !selected ? 'border-ink-0 border-[1.5px] shadow-sm' : ''}
        ${!isRoot && !selected ? 'border-surface-2' : ''}
        group cursor-pointer
        transition-all duration-150
        hover:-translate-y-0.5 hover:shadow-sm
        ${selected ? 'border-ink-3 shadow-md' : ''}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />

      {/* Banner image when available */}
      {hasImage && (
        <div className={`${isRoot ? 'h-[90px]' : 'h-[70px]'} bg-surface-1 overflow-hidden`}>
          <img
            src={data.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Label row */}
      <div className={`flex items-start gap-1.5 px-2.5 ${isMobile ? 'py-2.5 min-h-[44px]' : isRoot ? 'py-2.5' : 'py-2'}`}>
        <div className={`${isRoot ? 'w-2 h-2' : 'w-1.5 h-1.5'} flex-shrink-0 mt-1 rounded-full ${sourceColors[data.source]}`} />
        <span className={`${textClass} ${isRoot ? 'font-semibold' : 'font-medium'} text-ink-0 leading-tight break-words flex-1`}>
          {data.label}
        </span>
        {data.linkedMapId && (
          <div className="w-2 h-2 bg-accent flex-shrink-0 mt-1 rounded-sm" title={`Portal → ${data.linkedMapTitle || 'map'}`} />
        )}
        {approvedCount > 0 && (
          <div className="w-1.5 h-1.5 bg-node-user flex-shrink-0 mt-1 rounded-full" />
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-surface-3 !border-none !w-1.5 !h-1.5" />
    </div>
  );
}

export default memo(ConceptNodeComponent);
