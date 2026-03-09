'use client';

import { useCallback, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ConceptNode from './ConceptNode';
import ImageNode from './ImageNode';
import CustomEdge from './CustomEdge';
import { useExploration } from '@/hooks/useExploration';
import { NodeSource } from '@/lib/types';

const nodeTypes: NodeTypes = {
  concept: ConceptNode,
  image: ImageNode,
};

const edgeTypes: EdgeTypes = {
  default: CustomEdge,
};

const minimapColors: Record<NodeSource, string> = {
  wikipedia: '#f59e0b',
  dictionary: '#8b5cf6',
  wikidata: '#06b6d4',
  image: '#ec4899',
  user: '#10b981',
};

export default function Canvas() {
  const { nodes, edges, setActiveNode } = useExploration();

  const rfNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: { ...n.data },
      })),
    [nodes]
  );

  const rfEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: 'default',
        data: { label: e.label },
        label: e.label,
      })),
    [edges]
  );

  // Click any node → open panel (no auto-expand)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setActiveNode(node.id);
    },
    [setActiveNode]
  );

  const onPaneClick = useCallback(() => {
    setActiveNode(null);
  }, [setActiveNode]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#d6d3d1" gap={40} size={0.5} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => minimapColors[node.data?.source as NodeSource] || '#d6d3d1'}
          pannable
          zoomable
          maskColor="rgba(250, 250, 249, 0.7)"
        />
      </ReactFlow>
    </div>
  );
}
