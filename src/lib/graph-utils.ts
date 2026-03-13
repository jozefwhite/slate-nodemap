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
  const ySpacing = 110; // compact initial spacing — images adjust later
  const positions: { x: number; y: number }[] = [];

  // Approximate node dimensions for overlap detection (text-only size)
  const nodeW = 180;
  const nodeH = 55;

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

/**
 * After images load, some nodes grow taller and may overlap siblings.
 * This function checks siblings (nodes sharing a parent) and pushes
 * overlapping nodes apart vertically. Only adjusts nodes that actually
 * have images — text-only nodes keep their compact positions.
 */
export function resolveOverlaps(
  nodes: GraphNode[],
  edges: GraphEdge[]
): GraphNode[] | null {
  const NODE_W = 180;
  const IMAGE_NODE_H = 130; // banner (70) + label (~40) + padding
  const TEXT_NODE_H = 55;
  const MIN_GAP = 16;

  // Group nodes by parent
  const parentToChildren = new Map<string, string[]>();
  for (const edge of edges) {
    const children = parentToChildren.get(edge.source) || [];
    children.push(edge.target);
    parentToChildren.set(edge.source, children);
  }

  let changed = false;
  const updated = nodes.map((n) => ({ ...n, position: { ...n.position } }));
  const nodeMap = new Map(updated.map((n) => [n.id, n]));

  parentToChildren.forEach((childIds) => {
    if (childIds.length < 2) return;

    // Get sibling nodes sorted by Y position
    const siblings = childIds
      .map((id) => nodeMap.get(id))
      .filter((n): n is GraphNode => !!n)
      .sort((a, b) => a.position.y - b.position.y);

    // Check each consecutive pair for overlap
    for (let i = 0; i < siblings.length - 1; i++) {
      const upper = siblings[i];
      const lower = siblings[i + 1];

      // Skip if not in the same X column
      if (Math.abs(upper.position.x - lower.position.x) > NODE_W + 40) continue;

      const upperH = upper.data.imageUrl ? IMAGE_NODE_H : TEXT_NODE_H;
      const requiredGap = upperH + MIN_GAP;
      const actualGap = lower.position.y - upper.position.y;

      if (actualGap < requiredGap) {
        const shift = requiredGap - actualGap;
        // Push this node and all nodes below it down
        for (let j = i + 1; j < siblings.length; j++) {
          siblings[j].position.y += shift;
        }
        changed = true;
      }
    }
  });

  return changed ? updated : null;
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
