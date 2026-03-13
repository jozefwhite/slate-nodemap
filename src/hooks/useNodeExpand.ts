import { useCallback } from 'react';
import { useExploration } from './useExploration';
import { makeNode, makeEdge, computeChildPositions, deduplicateNodes } from '@/lib/graph-utils';
import { GraphNode, GraphEdge } from '@/lib/types';

// Fire-and-forget: pre-fetch Wikipedia summaries + thumbnails for child nodes
async function prefetchSummaries(nodesToFetch: GraphNode[]) {
  for (let i = 0; i < nodesToFetch.length; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, 200));

    try {
      const res = await fetch(
        `/api/wikipedia?title=${encodeURIComponent(nodesToFetch[i].data.label)}`
      );
      const wikiData = await res.json();

      if (wikiData.summary?.extract || wikiData.intro) {
        const summaryText = wikiData.intro || wikiData.summary?.extract || '';
        const { nodes: currentNodes } = useExploration.getState();
        const target = currentNodes.find((n) => n.id === nodesToFetch[i].id);
        if (target && !target.data.summary) {
          useExploration.setState({
            nodes: currentNodes.map((n) =>
              n.id === nodesToFetch[i].id
                ? {
                    ...n,
                    data: {
                      ...n.data,
                      summary: summaryText,
                      url: wikiData.summary?.content_urls?.desktop?.page || n.data.url,
                      imageUrl: n.data.imageUrl || wikiData.summary?.thumbnail?.source,
                      summarySource: 'wikipedia' as const,
                    },
                  }
                : n
            ),
          });
        }
      }
    } catch {
      // Silent fail — summary will load when panel opens
    }
  }
}

export function useNodeExpand() {
  const { nodes, expandNode, addNodes, setLoading } = useExploration();

  const expand = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.data.expanded) return;

      setLoading(true);
      expandNode(nodeId);

      try {
        const label = node.data.label;
        const isSingleWord = !label.includes(' ');

        // Fetch Wikipedia links
        const wikiRes = await fetch(`/api/wikipedia?title=${encodeURIComponent(label)}`);
        const wikiData = await wikiRes.json();
        // Prefer semantically related articles (morelike), fall back to page links
        const wikiLinks: string[] = (
          wikiData.related && wikiData.related.length > 0
            ? wikiData.related
            : wikiData.links || []
        ).slice(0, 6);

        // Optionally fetch dictionary for single words
        let dictWords: string[] = [];
        if (isSingleWord) {
          try {
            const dictRes = await fetch(`/api/dictionary?word=${encodeURIComponent(label)}`);
            const dictData = await dictRes.json();
            dictWords = (dictData.relatedWords || []).slice(0, 3);
          } catch {
            // Dictionary fetch is optional
          }
        }

        // Use Are.na channels as hidden discovery layer — lateral connections
        // get mixed into wiki suggestions without referencing the platform
        try {
          const arenaRes = await fetch(`/api/arena?q=${encodeURIComponent(label)}`);
          const arenaData = await arenaRes.json();
          const arenaHints = (arenaData.channels || [])
            .filter((c: { length: number }) => c.length > 5)
            .map((c: { title: string }) => c.title)
            .slice(0, 2);
          // Only add hints that aren't already in the wiki links
          const existingLower = new Set(wikiLinks.map((l: string) => l.toLowerCase()));
          for (const hint of arenaHints) {
            if (!existingLower.has(hint.toLowerCase())) {
              wikiLinks.push(hint);
            }
          }
        } catch {
          // Are.na is optional
        }

        const childCount = wikiLinks.length + dictWords.length;
        if (childCount === 0) {
          setLoading(false);
          return;
        }

        // Pass existing nodes so the layout can avoid collisions
        const currentNodesForLayout = useExploration.getState().nodes;
        const positions = computeChildPositions(
          node.position.x,
          node.position.y,
          childCount,
          node.data.depth,
          currentNodesForLayout
        );

        const newNodes: GraphNode[] = [];
        const newEdges: GraphEdge[] = [];

        // Create Wikipedia child nodes
        wikiLinks.forEach((title, i) => {
          const childNode = makeNode(title, 'wikipedia', positions[i], {
            depth: node.data.depth + 1,
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id));
        });

        // Create dictionary child nodes
        dictWords.forEach((word, i) => {
          const posIndex = wikiLinks.length + i;
          const childNode = makeNode(word, 'dictionary', positions[posIndex], {
            depth: node.data.depth + 1,
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id, 'synonym'));
        });

        // Deduplicate against existing nodes
        const currentNodes = useExploration.getState().nodes;
        const unique = deduplicateNodes(newNodes, currentNodes);
        const uniqueIds = new Set(unique.map((n) => n.id));
        const uniqueEdges = newEdges.filter((e) => uniqueIds.has(e.target));

        addNodes(unique, uniqueEdges);

        // Pre-fetch summaries + thumbnails in background (fire-and-forget)
        prefetchSummaries(unique);
      } catch (error) {
        console.error('Expansion failed:', error);
      } finally {
        setLoading(false);
      }
    },
    [nodes, expandNode, addNodes, setLoading]
  );

  return { expand };
}
