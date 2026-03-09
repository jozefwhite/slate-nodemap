import { useCallback } from 'react';
import { useExploration } from './useExploration';
import { makeNode, makeEdge, computeChildPositions, deduplicateNodes } from '@/lib/graph-utils';
import { GraphNode, GraphEdge } from '@/lib/types';

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
        const wikiLinks: string[] = (wikiData.links || []).slice(0, 6);

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

        const childCount = wikiLinks.length + dictWords.length;
        if (childCount === 0) {
          setLoading(false);
          return;
        }

        const positions = computeChildPositions(
          node.position.x,
          node.position.y,
          childCount,
          node.data.depth
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
        // Need to get the latest nodes from the store since expandNode just ran
        const currentNodes = useExploration.getState().nodes;
        const unique = deduplicateNodes(newNodes, currentNodes);
        const uniqueIds = new Set(unique.map((n) => n.id));
        const uniqueEdges = newEdges.filter((e) => uniqueIds.has(e.target));

        addNodes(unique, uniqueEdges);
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
