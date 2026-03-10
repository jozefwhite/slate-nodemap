'use client';

import { useState, useRef, useEffect, FormEvent, ReactNode } from 'react';
import {
  X,
  Check,
  Trash2,
  ExternalLink,
  Send,
  GitBranch,
  Loader2,
  Plus,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { buildAskContext } from '@/lib/context-builder';
import { makeNode, makeEdge, computeChildPositions } from '@/lib/graph-utils';
import { NodeQA, NodeSource } from '@/lib/types';

const sourceLabels: Record<NodeSource, string> = {
  wikipedia: 'WIKIPEDIA',
  dictionary: 'DICTIONARY',
  wikidata: 'WIKIDATA',
  image: 'IMAGE',
  user: 'USER',
};

const sourceColors: Record<NodeSource, string> = {
  wikipedia: 'bg-node-wikipedia',
  dictionary: 'bg-node-dictionary',
  wikidata: 'bg-node-wikidata',
  image: 'bg-node-image',
  user: 'bg-node-user',
};

/* ── Helpers ─────────────────────────────────────────────── */

// Section header with chevron toggle
function SectionHeader({
  label,
  badge,
  open,
  onToggle,
}: {
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full px-4 py-2 flex items-center gap-1.5 text-2xs font-mono uppercase tracking-wider text-ink-3 hover:text-ink-1 transition-colors"
    >
      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      <span>{label}</span>
      {badge && <span className="font-normal ml-0.5 normal-case">{badge}</span>}
    </button>
  );
}

// Parse [[wiki-links]] in answer text and render as clickable inline elements
function renderAnswerWithLinks(
  text: string,
  onTopicClick: (topic: string) => void
): ReactNode[] {
  const parts: ReactNode[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const topic = match[1].trim();
    parts.push(
      <button
        key={`link-${match.index}`}
        onClick={(e) => {
          e.stopPropagation();
          onTopicClick(topic);
        }}
        className="inline text-accent hover:underline cursor-pointer font-medium"
        title={`Explore: ${topic}`}
      >
        {topic}
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/* ── Main Panel ──────────────────────────────────────────── */

export default function NodePanel() {
  const {
    nodes,
    edges,
    path,
    activeNodeId,
    setActiveNode,
    addNodes,
    addConversation,
    approveAnswer,
    rejectAnswer,
    removeNode,
  } = useExploration();
  const { expand } = useNodeExpand();

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  // Section collapse states
  const [aboutOpen, setAboutOpen] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [qaOpen, setQaOpen] = useState(true);

  const contentRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  const node = nodes.find((n) => n.id === activeNodeId);

  // Reset section states when switching nodes
  useEffect(() => {
    setDescExpanded(false);
    setAboutOpen(true);
    setConnectionsOpen(true);
    setQaOpen(true);
  }, [activeNodeId]);

  // Auto-scroll content area when conversations change
  useEffect(() => {
    if (contentRef.current) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      });
    }
  }, [node?.data.conversations.length]);

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
        // Silent fail
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

  // Child nodes for the connections list
  const childEdges = edges.filter((e) => e.source === node.id);
  const childNodes = childEdges
    .map((e) => nodes.find((n) => n.id === e.target))
    .filter(Boolean);

  /* ── Handlers ──────────────────────────────────────────── */

  const handleAsk = async (e: FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || isAsking) return;

    setIsAsking(true);
    setQuestion('');
    setQaOpen(true); // Auto-open Q&A when asking

    try {
      const ctx = buildAskContext(node.id, q, nodes, path);
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ctx),
      });

      const responseData = await res.json();
      const answer = responseData.answer || 'Failed to get a response.';
      const suggestedTopics: string[] = responseData.suggestedTopics || [];

      const qa: NodeQA = {
        id: `qa-${Date.now()}`,
        question: q,
        answer,
        approved: false,
        timestamp: Date.now(),
        suggestedTopics,
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

  const handleBranchTopic = (topic: string) => {
    const existingChild = nodes.find(
      (n) =>
        n.data.label.toLowerCase() === topic.toLowerCase() &&
        edges.some((e) => e.source === node.id && e.target === n.id)
    );
    if (existingChild) {
      setActiveNode(existingChild.id);
      return;
    }

    const currentChildCount = edges.filter((e) => e.source === node.id).length;
    const positions = computeChildPositions(
      node.position.x,
      node.position.y,
      currentChildCount + 1,
      (data.depth || 0) + 1,
      nodes
    );
    const pos = positions[positions.length - 1];

    const newNode = makeNode(topic, 'user', pos, {
      depth: (data.depth || 0) + 1,
    });
    const newEdge = makeEdge(node.id, newNode.id);

    addNodes([newNode], [newEdge]);
    setActiveNode(newNode.id);
  };

  const handleAddToMap = (qa: NodeQA) => {
    if (!qa.approved) {
      approveAnswer(node.id, qa.id);
    }

    let title = qa.question
      .replace(
        /^(what|who|where|when|why|how|tell me about|explain|describe)\s+(is|are|was|were|do|does|did)?\s*/i,
        ''
      )
      .replace(/\?$/, '')
      .trim();
    title = title.charAt(0).toUpperCase() + title.slice(1);
    if (title.length > 50) title = title.slice(0, 47) + '...';
    if (title.length < 3) title = qa.question.slice(0, 50);

    const existingChild = nodes.find(
      (n) =>
        n.data.label.toLowerCase() === title.toLowerCase() &&
        edges.some((e) => e.source === node.id && e.target === n.id)
    );
    if (existingChild) {
      setActiveNode(existingChild.id);
      return;
    }

    const currentChildCount = edges.filter((e) => e.source === node.id).length;
    const positions = computeChildPositions(
      node.position.x,
      node.position.y,
      currentChildCount + 1,
      (data.depth || 0) + 1,
      nodes
    );
    const pos = positions[positions.length - 1];

    const cleanAnswer = qa.answer.replace(/\[\[([^\]]+)\]\]/g, '$1');

    const newNode = makeNode(title, 'user', pos, {
      depth: (data.depth || 0) + 1,
      summary: cleanAnswer,
      enrichedContent: `Q: ${qa.question}\nA: ${cleanAnswer}`,
    });
    const newEdge = makeEdge(node.id, newNode.id);

    addNodes([newNode], [newEdge]);
    setActiveNode(newNode.id);
  };

  const handleExpand = () => {
    expand(node.id);
  };

  const handleRemove = () => {
    setActiveNode(null);
    removeNode(node.id);
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="animate-slide-in absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-surface-2 flex flex-col z-50">
      {/* ── Header (always visible) ─────────────────────── */}
      <div className="px-4 py-3 border-b border-surface-2 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-2xs font-mono uppercase tracking-wider text-ink-3">
              {sourceLabels[data.source]}
            </span>
            {data.url && (
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink-3 hover:text-accent transition-colors"
                title="View source"
              >
                <ExternalLink size={10} />
              </a>
            )}
          </div>
          <h2 className="text-sm font-medium text-ink-0 leading-tight">{data.label}</h2>
        </div>
        <div className="flex items-center gap-0.5 flex-shrink-0">
          {!isRootNode && (
            <button
              onClick={handleRemove}
              className="text-ink-3 hover:text-red-500 transition-colors p-1"
              title="Remove node"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={() => setActiveNode(null)}
            className="text-ink-3 hover:text-ink-0 transition-colors p-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* ── Scrollable content sections ─────────────────── */}
      <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
        {/* ── About section ──────────────────────────────── */}
        <div className="border-b border-surface-2">
          <SectionHeader label="about" open={aboutOpen} onToggle={() => setAboutOpen(!aboutOpen)} />

          {aboutOpen && (
            <div className="px-4 pb-3 -mt-0.5">
              {isFetchingSummary ? (
                <div className="flex items-center gap-2 text-xs text-ink-3">
                  <Loader2 size={12} className="animate-spin" />
                  loading...
                </div>
              ) : data.summary ? (
                <>
                  <p
                    className={`text-xs text-ink-2 leading-relaxed whitespace-pre-line ${
                      !descExpanded ? 'line-clamp-4' : ''
                    }`}
                  >
                    {data.summary}
                  </p>
                  {data.summary.length > 200 && (
                    <button
                      onClick={() => setDescExpanded(!descExpanded)}
                      className="text-2xs text-accent hover:underline mt-1.5"
                    >
                      {descExpanded ? 'show less' : 'show more'}
                    </button>
                  )}
                </>
              ) : (
                <p className="text-xs text-ink-3 italic">no summary available</p>
              )}

              {/* Enriched content (learned from Q&A) */}
              {data.enrichedContent && (
                <div className="mt-3 pt-2.5 border-t border-surface-2">
                  <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-1.5">
                    learned
                  </span>
                  <p className="text-xs text-ink-2 leading-relaxed whitespace-pre-line line-clamp-3">
                    {data.enrichedContent}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Connections section ─────────────────────────── */}
        <div className="border-b border-surface-2">
          <SectionHeader
            label="connections"
            badge={childNodes.length > 0 ? `(${childNodes.length})` : undefined}
            open={connectionsOpen}
            onToggle={() => setConnectionsOpen(!connectionsOpen)}
          />

          {connectionsOpen && (
            <div className="px-4 pb-3 -mt-0.5">
              {!data.expanded ? (
                <button
                  onClick={handleExpand}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-ink-0 text-white text-xs hover:bg-ink-1 transition-colors"
                >
                  <GitBranch size={12} />
                  explore connections
                </button>
              ) : childNodes.length > 0 ? (
                <div className="space-y-0.5">
                  {childNodes.map(
                    (child) =>
                      child && (
                        <button
                          key={child.id}
                          onClick={() => setActiveNode(child.id)}
                          className="w-full text-left text-xs text-ink-2 hover:text-ink-0 px-2 py-1.5 hover:bg-surface-0 transition-colors flex items-center gap-2"
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              sourceColors[child.data.source]
                            }`}
                          />
                          <span className="truncate">{child.data.label}</span>
                        </button>
                      )
                  )}
                </div>
              ) : (
                <span className="text-xs text-ink-3 italic">no connections yet</span>
              )}
            </div>
          )}
        </div>

        {/* ── Q&A section ────────────────────────────────── */}
        <div className="border-b border-surface-2">
          <SectionHeader
            label="questions"
            badge={
              approvedCount > 0
                ? `(${approvedCount} saved)`
                : data.conversations.length > 0
                  ? `(${data.conversations.length})`
                  : undefined
            }
            open={qaOpen}
            onToggle={() => setQaOpen(!qaOpen)}
          />

          {qaOpen && (
            <div className="px-4 pb-3 space-y-3 -mt-0.5">
              {data.conversations.length === 0 && !isAsking && (
                <p className="text-xs text-ink-3 italic py-1">
                  no questions yet — use the input below to ask about this topic
                </p>
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
                      <p className="leading-relaxed whitespace-pre-line">
                        {renderAnswerWithLinks(qa.answer, handleBranchTopic)}
                      </p>

                      {/* Extra suggested topics not already inline */}
                      {qa.suggestedTopics &&
                        qa.suggestedTopics.length > 0 &&
                        (() => {
                          const inlineTopics = new Set(
                            (qa.answer.match(/\[\[([^\]]+)\]\]/g) || []).map((m) =>
                              m.slice(2, -2).trim().toLowerCase()
                            )
                          );
                          const extraTopics = qa.suggestedTopics.filter(
                            (t) => !inlineTopics.has(t.toLowerCase())
                          );
                          if (extraTopics.length === 0) return null;
                          return (
                            <div className="mt-2 pt-2 border-t border-surface-2">
                              <span className="text-2xs text-ink-3 block mb-1.5">
                                explore further:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {extraTopics.map((topic) => (
                                  <button
                                    key={topic}
                                    onClick={() => handleBranchTopic(topic)}
                                    className="inline-flex items-center gap-1 text-2xs bg-white border border-surface-2 px-2 py-1 text-ink-2 hover:border-ink-3 hover:text-ink-0 transition-colors"
                                  >
                                    <Plus size={8} />
                                    {topic}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                      {/* Answer actions */}
                      {!qa.approved ? (
                        <div className="flex gap-2 mt-2 pt-2 border-t border-surface-2">
                          <button
                            onClick={() => approveAnswer(node.id, qa.id)}
                            className="flex items-center gap-1 text-2xs text-node-user hover:underline"
                          >
                            <Check size={10} /> keep
                          </button>
                          <button
                            onClick={() => handleAddToMap(qa)}
                            className="flex items-center gap-1 text-2xs text-accent hover:underline"
                          >
                            <MapPin size={10} /> add to map
                          </button>
                          <button
                            onClick={() => rejectAnswer(node.id, qa.id)}
                            className="flex items-center gap-1 text-2xs text-ink-3 hover:text-red-500"
                          >
                            <Trash2 size={10} /> discard
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-2xs mt-2 pt-2 border-t border-surface-2">
                          <span className="flex items-center gap-1 text-node-user">
                            <Check size={10} /> saved
                          </span>
                          <button
                            onClick={() => handleAddToMap(qa)}
                            className="flex items-center gap-1 text-accent hover:underline ml-auto"
                          >
                            <MapPin size={10} /> add to map
                          </button>
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
          )}
        </div>
      </div>

      {/* ── Input bar (always pinned at bottom) ──────────── */}
      <div className="px-4 py-3 border-t border-surface-2 flex-shrink-0">
        <form onSubmit={handleAsk} className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="ask about this topic..."
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
      </div>
    </div>
  );
}
