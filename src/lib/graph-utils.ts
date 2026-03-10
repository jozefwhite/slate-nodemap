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
 *
 * Pass `existingNodes` so the algorithm can avoid collisions with nodes
 * that are already on the canvas (e.g. children of other parents at the
 * same depth).
 */
export function computeChildPositions(
  parentX: number,
  parentY: number,
  childCount: number,
  depth: number,
  existingNodes: GraphNode[] = []
): { x: number; y: number }[] {
  const xOffset = 320; // horizontal distance to the right
  const ySpacing = 200; // vertical spacing between siblings (increased from 140)
  const positions: { x: number; y: number }[] = [];

  const targetX = parentX + xOffset;

  // Collect Y positions occupied by existing nodes near the target X
  const occupied = existingNodes
    .filter((n) => Math.abs(n.position.x - targetX) < 250)
    .map((n) => n.position.y);

  // Center children vertically around parent
  const totalHeight = (childCount - 1) * ySpacing;
  const startY = parentY - totalHeight / 2;

  for (let i = 0; i < childCount; i++) {
    let y = startY + i * ySpacing;

    // Resolve collisions: nudge down until clear of existing nodes
    let attempts = 0;
    while (attempts < 30 && occupied.some((oy) => Math.abs(oy - y) < ySpacing * 0.6)) {
      y += ySpacing * 0.75;
      attempts++;
    }

    positions.push({ x: targetX, y });
    occupied.push(y); // Mark as occupied for subsequent siblings
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
