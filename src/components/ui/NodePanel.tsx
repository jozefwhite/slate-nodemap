'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { X, Check, Trash2, ExternalLink, Send, GitBranch, Loader2 } from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { buildAskContext } from '@/lib/context-builder';
import { NodeQA, NodeSource } from '@/lib/types';

const sourceLabels: Record<NodeSource, string> = {
  wikipedia: 'WIKIPEDIA',
  dictionary: 'DICTIONARY',
  wikidata: 'WIKIDATA',
  image: 'IMAGE',
  user: 'USER',
};

export default function NodePanel() {
  const {
    nodes,
    edges,
    path,
    activeNodeId,
    setActiveNode,
    addConversation,
    approveAnswer,
    rejectAnswer,
    removeNode,
  } = useExploration();
  const { expand } = useNodeExpand();

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  const node = nodes.find((n) => n.id === activeNodeId);

  // Auto-fetch Wikipedia summary for nodes that don't have one yet
  useEffect(() => {
    if (!node) return;
    if (node.data.summary) return;
    if (fetchedRef.current.has(node.id)) return;
    fetchedRef.current.add(node.id);

    const fetchSummary = async () => {
      setIsFetchingSummary(true);
      try {
        const res = await fetch(`/api/wikipedia?title=${encodeURIComponent(node.data.label)}`);
        const data = await res.json();
        if (data.summary?.extract || data.intro) {
          const summaryText = data.intro || data.summary?.extract || '';
          // Update the node's summary in the store
          const { nodes: currentNodes } = useExploration.getState();
          const targetNode = currentNodes.find((n) => n.id === node.id);
          if (targetNode && !targetNode.data.summary) {
            useExploration.setState({
              nodes: currentNodes.map((n) =>
                n.id === node.id
                  ? {
                      ...n,
                      data: {
                        ...n.data,
                        summary: summaryText,
                        url: data.summary?.content_urls?.desktop?.page,
                        imageUrl: n.data.imageUrl || data.summary?.thumbnail?.source,
                      },
                    }
                  : n
              ),
            });
          }
        }
      } catch {
        // Silent fail — summary fetch is best-effort
      } finally {
        setIsFetchingSummary(false);
      }
    };

    fetchSummary();
  }, [node?.id, node?.data.summary, node?.data.label]);

  if (!node) return null;

  const { data } = node;
  const approvedCount = data.conversations.filter((c) => c.approved).length;
  const isRootNode = nodes.indexOf(node) === 0;
  const childCount = edges.filter((e) => e.source === node.id).length;

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    setQuestion('');

    try {
      const ctx = buildAskContext(node.id, q, nodes, path);
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });

      const responseData = await res.json();
      const answer = responseData.answer || 'Failed to get a response.';

      const qa: NodeQA = {
        id: `qa-${Date.now()}`,
        question: q,
        answer,
        approved: false,
        timestamp: Date.now(),
      };

      addConversation(node.id, qa);
    } catch {
      const qa: NodeQA = {
        id: `qa-${Date.now()}`,
        question: q,
        answer: 'Something went wrong. Please try again.',
        approved: false,
        timestamp: Date.now(),
      };
      addConversation(node.id, qa);
    } finally {
      setIsAsking(false);
    }
  };

  const handleExpand = () => {
    expand(node.id);
  };

  const handleRemove = () => {
    setActiveNode(null);
    removeNode(node.id);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data.conversations.length]);

  return (
    <div className="animate-slide-in absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-surface-2 flex flex-col z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-2 flex items-start justify-between">
        <div>
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-1">
            {sourceLabels[data.source]}
          </span>
          <h2 className="text-sm font-medium text-ink-0">{data.label}</h2>
        </div>
        <button
          onClick={() => setActiveNode(null)}
          className="text-ink-3 hover:text-ink-0 transition-colors p-1"
        >
          <X size={16} />
        </button>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-surface-2 max-h-[40vh] overflow-y-auto">
        {isFetchingSummary ? (
          <div className="flex items-center gap-2 text-xs text-ink-3">
            <Loader2 size={12} className="animate-spin" />
            loading summary...
          </div>
        ) : data.summary ? (
          <>
            <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-line">{data.summary}</p>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-2xs text-accent mt-2 hover:underline"
              >
                source <ExternalLink size={10} />
              </a>
            )}
          </>
        ) : (
          <p className="text-xs text-ink-3">no summary available</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-4 py-2.5 border-b border-surface-2 flex gap-2">
        {!data.expanded && (
          <button
            onClick={handleExpand}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-0 text-white text-xs hover:bg-ink-1 transition-colors"
          >
            <GitBranch size={12} />
            explore connections
          </button>
        )}
        {data.expanded && (
          <span className="flex items-center gap-1.5 text-2xs text-ink-3">
            <GitBranch size={12} />
            {childCount} connection{childCount !== 1 ? 's' : ''}
          </span>
        )}
        {!isRootNode && (
          <button
            onClick={handleRemove}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-surface-2 text-xs text-ink-3 hover:text-red-500 hover:border-red-300 transition-colors ml-auto"
          >
            <Trash2 size={12} />
            remove
          </button>
        )}
      </div>

      {/* Enriched content */}
      {data.enrichedContent && (
        <div className="px-4 py-3 border-b border-surface-2 bg-surface-0">
          <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-2">
            learned
          </span>
          <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-line">
            {data.enrichedContent}
          </p>
        </div>
      )}

      {/* Conversation thread */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {data.conversations.length === 0 && !isAsking && (
          <div className="flex items-center justify-center h-full">
            <p className="text-xs text-ink-3 text-center leading-relaxed max-w-[200px]">
              ask anything about this node. good answers get saved to build knowledge.
            </p>
          </div>
        )}

        {data.conversations.map((qa) => (
          <div key={qa.id} className="space-y-2">
            {/* Question */}
            <div className="flex justify-end">
              <div className="bg-ink-0 text-white text-xs px-3 py-2 max-w-[85%]">
                {qa.question}
              </div>
            </div>

            {/* Answer */}
            <div className="flex justify-start">
              <div className="bg-surface-1 text-ink-1 text-xs px-3 py-2 max-w-[85%]">
                <p className="leading-relaxed whitespace-pre-line">{qa.answer}</p>

                {!qa.approved ? (
                  <div className="flex gap-2 mt-2 pt-2 border-t border-surface-2">
                    <button
                      onClick={() => approveAnswer(node.id, qa.id)}
                      className="flex items-center gap-1 text-2xs text-node-user hover:underline"
                    >
                      <Check size={10} /> keep
                    </button>
                    <button
                      onClick={() => rejectAnswer(node.id, qa.id)}
                      className="flex items-center gap-1 text-2xs text-ink-3 hover:text-red-500"
                    >
                      <Trash2 size={10} /> discard
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-2xs text-node-user mt-2 pt-2 border-t border-surface-2">
                    <Check size={10} /> saved to node
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {isAsking && (
          <div className="flex justify-start">
            <div className="bg-surface-1 text-ink-3 text-xs px-3 py-2 animate-pulse-subtle">
              thinking...
            </div>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 border-t border-surface-2">
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="ask about this node..."
            disabled={isAsking}
            className="flex-1 bg-surface-1 border border-surface-2 text-xs text-ink-1 px-3 py-2 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors"
          />
          <button
            type="submit"
            disabled={isAsking || !question.trim()}
            className="bg-ink-0 text-white p-2 hover:bg-ink-1 disabled:opacity-30 transition-colors"
          >
            <Send size={12} />
          </button>
        </form>
        {approvedCount > 0 && (
          <p className="text-2xs text-ink-3 mt-1.5">
            {approvedCount} answer{approvedCount !== 1 ? 's' : ''} saved
          </p>
        )}
      </div>
    </div>
  );
}
