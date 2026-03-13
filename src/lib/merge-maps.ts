import { GraphNode, GraphEdge, PathStep, SavedMap } from '@/lib/types';

/**
 * Merge multiple saved maps into a single set of nodes, edges, and path.
 *
 * Algorithm:
 * 1. Collect all nodes from all maps
 * 2. Deduplicate by label (case-insensitive) — keep the node with the richest data
 * 3. Remap edge source/target IDs to deduplicated node IDs
 * 4. For shared nodes, create bridge edges connecting the different graphs
 * 5. Offset each map's nodes horizontally so they don't overlap
 * 6. Merge paths chronologically
 */
export function mergeMaps(maps: SavedMap[]): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  path: PathStep[];
} {
  if (maps.length === 0) return { nodes: [], edges: [], path: [] };
  if (maps.length === 1) return { nodes: maps[0].nodes, edges: maps[0].edges, path: maps[0].path };

  // Step 1: Assign horizontal offsets so maps don't overlap
  const MAP_SPACING = 600;
  const mapOffsets: number[] = [];
  let currentOffset = 0;

  for (const map of maps) {
    mapOffsets.push(currentOffset);
    // Find the width of this map's nodes
    if (map.nodes.length > 0) {
      const minX = Math.min(...map.nodes.map((n) => n.position.x));
      const maxX = Math.max(...map.nodes.map((n) => n.position.x));
      currentOffset += (maxX - minX) + MAP_SPACING;
    } else {
      currentOffset += MAP_SPACING;
    }
  }

  // Step 2: Build label → best node mapping (deduplication)
  // Track which original IDs map to the canonical node ID
  const labelToNode = new Map<string, GraphNode>();
  const idRemap = new Map<string, string>(); // oldId → canonicalId

  for (let mi = 0; mi < maps.length; mi++) {
    const map = maps[mi];
    const offset = mapOffsets[mi];

    for (const node of map.nodes) {
      const key = node.data.label.toLowerCase().trim();
      const offsetNode: GraphNode = {
        ...node,
        position: { x: node.position.x + offset, y: node.position.y },
      };

      const existing = labelToNode.get(key);
      if (!existing) {
        // First occurrence — use this node
        labelToNode.set(key, offsetNode);
        idRemap.set(node.id, offsetNode.id);
      } else {
        // Duplicate — keep the one with more data, remap the other
        const existingScore = nodeRichness(existing);
        const newScore = nodeRichness(offsetNode);

        if (newScore > existingScore) {
          // New node is richer — replace but keep canonical ID
          const canonical = existing.id;
          // Position the richer node in the middle
          const midX = (existing.position.x + offsetNode.position.x) / 2;
          const midY = (existing.position.y + offsetNode.position.y) / 2;
          labelToNode.set(key, {
            ...offsetNode,
            id: canonical,
            data: { ...offsetNode.data, id: canonical },
            position: { x: midX, y: midY },
          });
          idRemap.set(node.id, canonical);
        } else {
          // Existing node is richer — just remap
          // Position in the middle
          const midX = (existing.position.x + offsetNode.position.x) / 2;
          const midY = (existing.position.y + offsetNode.position.y) / 2;
          labelToNode.set(key, {
            ...existing,
            position: { x: midX, y: midY },
          });
          idRemap.set(node.id, existing.id);
        }
      }
    }
  }

  const mergedNodes = Array.from(labelToNode.values());

  // Step 3: Remap edges and deduplicate
  const edgeSet = new Set<string>();
  const mergedEdges: GraphEdge[] = [];

  for (const map of maps) {
    for (const edge of map.edges) {
      const remappedSource = idRemap.get(edge.source) || edge.source;
      const remappedTarget = idRemap.get(edge.target) || edge.target;

      // Skip self-loops created by merging
      if (remappedSource === remappedTarget) continue;

      const edgeKey = `${remappedSource}->${remappedTarget}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        mergedEdges.push({
          id: `edge-${remappedSource}-${remappedTarget}`,
          source: remappedSource,
          target: remappedTarget,
          label: edge.label,
        });
      }
    }
  }

  // Step 4: Merge paths chronologically
  const allPaths: PathStep[] = [];
  for (const map of maps) {
    for (const step of map.path) {
      allPaths.push({
        ...step,
        nodeId: idRemap.get(step.nodeId) || step.nodeId,
      });
    }
  }
  allPaths.sort((a, b) => a.timestamp - b.timestamp);

  return {
    nodes: mergedNodes,
    edges: mergedEdges,
    path: allPaths,
  };
}

/** Score a node by how much data it has — used to pick the "richer" duplicate */
function nodeRichness(node: GraphNode): number {
  let score = 0;
  if (node.data.summary) score += 3;
  if (node.data.imageUrl) score += 2;
  if (node.data.enrichedContent) score += 2;
  if (node.data.url) score += 1;
  score += node.data.conversations.length;
  score += node.data.tags.length * 0.5;
  return score;
}
