import { useCallback } from 'react';
import { useExploration } from './useExploration';
import { makeNode, makeEdge, computeChildPositions, deduplicateNodes, settleLayout } from '@/lib/graph-utils';
import { GraphNode, GraphEdge } from '@/lib/types';

/** Debounced layout settle — batches rapid image loads into one settle pass */
let settleTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSettle() {
  if (settleTimer) clearTimeout(settleTimer);
  settleTimer = setTimeout(() => {
    settleTimer = null;
    const { nodes } = useExploration.getState();
    const adjusted = settleLayout(nodes);
    if (adjusted) {
      useExploration.setState({ nodes: adjusted });
    }
  }, 300); // batch image loads within 300ms
}

// Enrich a single node: Wikipedia summary + thumbnail, YouTube image fallback
async function prefetchOne(node: GraphNode) {
  try {
    const res = await fetch(
      `/api/wikipedia?title=${encodeURIComponent(node.data.label)}`
    );
    const wikiData = await res.json();

    if (wikiData.summary?.extract || wikiData.intro) {
      const summaryText = wikiData.intro || wikiData.summary?.extract || '';
      const { nodes: currentNodes } = useExploration.getState();
      const target = currentNodes.find((n) => n.id === node.id);
      if (target && !target.data.summary) {
        const gotImage = !target.data.imageUrl && !!wikiData.summary?.thumbnail?.source;
        useExploration.setState({
          nodes: currentNodes.map((n) =>
            n.id === node.id
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
        // If this node just got an image, resolve any new overlaps
        if (gotImage) scheduleSettle();
      }
    }
  } catch {
    // Silent fail — summary will load when panel opens
  }

  // YouTube thumbnail fallback — if Wikipedia had no image, try YouTube
  const { nodes: latestNodes } = useExploration.getState();
  const latestTarget = latestNodes.find((n) => n.id === node.id);
  if (latestTarget && !latestTarget.data.imageUrl) {
    try {
      const ytRes = await fetch(
        `/api/youtube?q=${encodeURIComponent(node.data.label)}&maxResults=1`
      );
      const ytData = await ytRes.json();
      if (ytData.results?.[0]?.thumbnailUrl) {
        const { nodes: nowNodes } = useExploration.getState();
        useExploration.setState({
          nodes: nowNodes.map((n) =>
            n.id === node.id && !n.data.imageUrl
              ? { ...n, data: { ...n.data, imageUrl: ytData.results[0].thumbnailUrl } }
              : n
          ),
        });
        // Image just loaded — resolve overlaps
        scheduleSettle();
      }
    } catch {
      // YouTube fallback is optional
    }
  }
}

// Fire-and-forget: pre-fetch summaries with bounded concurrency (3 at a time)
async function prefetchSummaries(nodesToFetch: GraphNode[]) {
  const queue = [...nodesToFetch];
  const workers = Array.from({ length: Math.min(3, queue.length) }, async () => {
    while (queue.length > 0) {
      const node = queue.shift();
      if (node) await prefetchOne(node);
    }
  });
  await Promise.all(workers);
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

        // Fetch every source in parallel — Wikipedia backbone plus
        // lateral discovery (Are.na channels, Datamuse associations)
        const [wikiData, dictData, arenaData, museData] = await Promise.all([
          fetch(`/api/wikipedia?title=${encodeURIComponent(label)}`)
            .then((r) => r.json())
            .catch(() => ({})),
          isSingleWord
            ? fetch(`/api/dictionary?word=${encodeURIComponent(label)}`)
                .then((r) => r.json())
                .catch(() => null)
            : Promise.resolve(null),
          fetch(`/api/arena?q=${encodeURIComponent(label)}`)
            .then((r) => r.json())
            .catch(() => ({ channels: [] })),
          fetch(`/api/datamuse?q=${encodeURIComponent(label)}`)
            .then((r) => r.json())
            .catch(() => ({ associations: [] })),
        ]);

        // Prefer semantically related articles (morelike), fall back to page links
        const wikiLinks: string[] = (
          wikiData.related && wikiData.related.length > 0
            ? wikiData.related
            : wikiData.links || []
        ).slice(0, 5);

        const dictWords: string[] = (dictData?.relatedWords || []).slice(0, 2);

        // Are.na channels — first-class lateral nodes with their own source
        const arenaChannels: {
          title: string;
          url: string;
          length: number;
          description?: string;
          thumbnailUrl?: string;
          userName?: string;
          blockTitles?: string[];
        }[] = (arenaData.channels || []).slice(0, 2);

        // Datamuse lateral associations that aren't already covered
        const taken = new Set(
          [...wikiLinks, ...dictWords].map((s) => s.toLowerCase())
        );
        const associations: string[] = (museData.associations || [])
          .filter((a: string) => !taken.has(a.toLowerCase()))
          .slice(0, 2);

        // Only fall back to Claude when every source came back empty
        if (
          wikiLinks.length === 0 &&
          dictWords.length === 0 &&
          arenaChannels.length === 0 &&
          associations.length === 0
        ) {
          try {
            const existingLabels = useExploration.getState().nodes.map((n) => n.data.label);
            const seedTerm = useExploration.getState().seedTerm;
            const suggestRes = await fetch('/api/suggest', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                topic: label,
                context: seedTerm || undefined,
                existingNodes: existingLabels,
              }),
            });
            const suggestData = await suggestRes.json();
            const aiSuggestions: string[] = suggestData.suggestions || [];
            for (const s of aiSuggestions) {
              wikiLinks.push(s);
            }
          } catch {
            // AI suggestions are optional
          }
        }

        const childCount =
          wikiLinks.length + dictWords.length + associations.length + arenaChannels.length;
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
        let posIndex = 0;

        // Wikipedia children — the semantic backbone
        wikiLinks.forEach((title) => {
          const childNode = makeNode(title, 'wikipedia', positions[posIndex++], {
            depth: node.data.depth + 1,
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id));
        });

        // Lateral associations — enriched by prefetch like wiki nodes
        associations.forEach((word) => {
          const childNode = makeNode(word, 'wikipedia', positions[posIndex++], {
            depth: node.data.depth + 1,
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id, 'association'));
        });

        // Dictionary children
        dictWords.forEach((word) => {
          const childNode = makeNode(word, 'dictionary', positions[posIndex++], {
            depth: node.data.depth + 1,
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id, 'synonym'));
        });

        // Are.na channels — curated lateral collections, linked + pre-enriched
        arenaChannels.forEach((channel) => {
          const summaryParts: string[] = [];
          if (channel.description) summaryParts.push(channel.description);
          summaryParts.push(
            `${channel.length} blocks curated by ${channel.userName || 'the are.na community'}.`
          );
          if (channel.blockTitles && channel.blockTitles.length > 0) {
            summaryParts.push(`Inside: ${channel.blockTitles.join(' · ')}`);
          }

          const childNode = makeNode(channel.title, 'arena', positions[posIndex++], {
            depth: node.data.depth + 1,
            summary: summaryParts.join('\n'),
            url: channel.url,
            imageUrl: channel.thumbnailUrl,
            tags: ['are.na'],
          });
          newNodes.push(childNode);
          newEdges.push(makeEdge(nodeId, childNode.id, 'are.na'));
        });

        // Deduplicate against existing nodes
        const currentNodes = useExploration.getState().nodes;
        const unique = deduplicateNodes(newNodes, currentNodes);
        const uniqueIds = new Set(unique.map((n) => n.id));
        const uniqueEdges = newEdges.filter((e) => uniqueIds.has(e.target));

        addNodes(unique, uniqueEdges);

        // Settle layout immediately after adding new nodes
        scheduleSettle();

        // Pre-fetch summaries + thumbnails in background (fire-and-forget).
        // Are.na nodes are already enriched — a Wikipedia lookup on a channel
        // title would attach the wrong content.
        prefetchSummaries(unique.filter((n) => n.data.source !== 'arena'));
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
