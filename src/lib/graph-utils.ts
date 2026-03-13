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
      summarySource: opts.summarySource,
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
 * Organic tree layout: children branch to the right of the parent
 * with slight natural variation so the graph feels grown, not gridded.
 * Collision-aware — checks against existing canvas nodes.
 */
export function computeChildPositions(
  parentX: number,
  parentY: number,
  childCount: number,
  depth: number,
  existingNodes: GraphNode[] = []
): { x: number; y: number }[] {
  const baseXOffset = 280;
  const ySpacing = 160; // enough room for banner image + label
  const positions: { x: number; y: number }[] = [];

  // Approximate node dimensions for overlap detection
  // Accounts for banner image (70px) + label area (~45px) + padding
  const nodeW = 180;
  const nodeH = 140;

  // Center children around parent Y
  const totalHeight = (childCount - 1) * ySpacing;
  const startY = parentY - totalHeight / 2;

  // Track occupied rectangles (existing + siblings placed so far)
  const occupied = existingNodes
    .filter((n) => Math.abs(n.position.x - (parentX + baseXOffset)) < nodeW + 60)
    .map((n) => ({ x: n.position.x, y: n.position.y }));

  for (let i = 0; i < childCount; i++) {
    // Small organic variation so it doesn't feel gridded
    const xJitter = (Math.random() - 0.5) * 50; // ±25px
    const yJitter = (Math.random() - 0.5) * 24; // ±12px

    let x = parentX + baseXOffset + xJitter;
    let y = startY + i * ySpacing + yJitter;

    // Nudge down if overlapping another node's bounding box
    let attempts = 0;
    while (
      attempts < 20 &&
      occupied.some((o) => Math.abs(o.x - x) < nodeW && Math.abs(o.y - y) < nodeH)
    ) {
      y += nodeH + 10;
      attempts++;
    }

    positions.push({ x, y });
    occupied.push({ x, y });
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
