'use client';

import { useCallback, useMemo, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  NodeTypes,
  EdgeTypes,
  BackgroundVariant,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';
import ConceptNode from './ConceptNode';
import ImageNode from './ImageNode';
import CustomEdge from './CustomEdge';
import { useExploration } from '@/hooks/useExploration';
import { useIsMobile } from '@/hooks/useIsMobile';
import { NodeSource } from '@/lib/types';
import { settleAround } from '@/lib/graph-utils';

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
  arena: '#64748b',
};

export default function Canvas() {
  const { nodes, edges, setActiveNode } = useExploration();
  const isMobile = useIsMobile();
  const rfInstance = useRef<ReactFlowInstance | null>(null);

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

  // Click any node → open panel (on mobile, also center)
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (isMobile && rfInstance.current) {
        // Center the node in the upper portion of the viewport
        // (leave room for the bottom sheet which takes ~50% of screen)
        rfInstance.current.setCenter(
          node.position.x + 90,
          node.position.y - 50,
          { zoom: 1.2, duration: 400 }
        );
      }
      setActiveNode(node.id);
    },
    [setActiveNode, isMobile]
  );

  const onPaneClick = useCallback(() => {
    setActiveNode(null);
  }, [setActiveNode]);

  // Drag: sync position to the store and squish overlapping neighbors
  // out of the way. Soft factor during drag = organic push; full settle
  // on release so nothing is left overlapping.
  const applyDrag = useCallback((node: Node, softness: number) => {
    const { nodes: current } = useExploration.getState();
    const moved = current.map((n) =>
      n.id === node.id ? { ...n, position: { ...node.position } } : n
    );
    const squished = settleAround(moved, node.id, softness);
    useExploration.setState({ nodes: squished ?? moved });
  }, []);

  const onNodeDrag = useCallback(
    (_: React.MouseEvent, node: Node) => applyDrag(node, 0.45),
    [applyDrag]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => applyDrag(node, 1),
    [applyDrag]
  );

  const onInit = useCallback((instance: ReactFlowInstance) => {
    rfInstance.current = instance;
  }, []);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        onInit={onInit}
        nodesDraggable={!isMobile}
        fitView
        fitViewOptions={{ padding: isMobile ? 0.5 : 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} color="#d6d3d1" gap={40} size={0.5} />
        {!isMobile && <Controls showInteractive={false} />}
        {!isMobile && (
          <MiniMap
            nodeColor={(node) => minimapColors[node.data?.source as NodeSource] || '#d6d3d1'}
            pannable
            zoomable
            maskColor="rgba(250, 250, 249, 0.7)"
          />
        )}
      </ReactFlow>
    </div>
  );
}
