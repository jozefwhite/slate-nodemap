import { GraphNode, GraphEdge, ConceptNodeData, NodeSource } from '@/lib/types';

let nodeCounter = 0;

export function makeNode(
  label: string,
  source: NodeSource,
  position: { x: number; y: number },
  opts: Partial<ConceptNodeData> = {}
): GraphNode {
  const id = `node-${Date.now()}-${nodeCounter++}`;
  return {
    id,
    type: source === 'image' ? 'image' : 'concept',
    position,
    data: {
      id,
      label,
      source,
      summary: opts.summary,
      imageUrl: opts.imageUrl,
      tags: opts.tags || [],
      url: opts.url,
      expanded: false,
      depth: opts.depth ?? 0,
      createdAt: new Date().toISOString(),
      conversations: [],
      enrichedContent: opts.enrichedContent,
    },
  };
}

export function makeEdge(
  sourceId: string,
  targetId: string,
  label?: string
): GraphEdge {
  return {
    id: `edge-${sourceId}-${targetId}`,
    source: sourceId,
    target: targetId,
    label,
  };
}

/**
 * Tree layout: children are placed in a column to the right of the parent,
 * spread vertically with enough spacing to avoid overlaps.
 */
export function computeChildPositions(
  parentX: number,
  parentY: number,
  childCount: number,
  depth: number
): { x: number; y: number }[] {
  const xOffset = 320; // horizontal distance to the right
  const ySpacing = 140; // vertical spacing between siblings
  const positions: { x: number; y: number }[] = [];

  // Center children vertically around parent
  const totalHeight = (childCount - 1) * ySpacing;
  const startY = parentY - totalHeight / 2;

  for (let i = 0; i < childCount; i++) {
    // Small jitter to avoid perfectly rigid grid
    const jitterY = (Math.random() - 0.5) * 20;
    positions.push({
      x: parentX + xOffset,
      y: startY + i * ySpacing + jitterY,
    });
  }

  return positions;
}

export function deduplicateNodes(
  newNodes: GraphNode[],
  existingNodes: GraphNode[]
): GraphNode[] {
  const existingLabels = new Set(
    existingNodes.map((n) => n.data.label.toLowerCase())
  );
  return newNodes.filter((n) => !existingLabels.has(n.data.label.toLowerCase()));
}

/**
 * Get all descendant node IDs of a given node by traversing edges.
 */
export function getDescendantIds(
  nodeId: string,
  edges: GraphEdge[]
): Set<string> {
  const descendants = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of edges) {
      if (edge.source === current && !descendants.has(edge.target)) {
        descendants.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return descendants;
}
