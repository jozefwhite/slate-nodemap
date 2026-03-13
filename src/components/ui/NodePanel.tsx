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
  Link2,
} from 'lucide-react';
import { useExploration } from '@/hooks/useExploration';
import { useNodeExpand } from '@/hooks/useNodeExpand';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useBottomSheet } from '@/hooks/useBottomSheet';
import { useNodeMedia } from '@/hooks/useNodeMedia';
import { buildAskContext } from '@/lib/context-builder';
import { makeNode, makeEdge, computeChildPositions } from '@/lib/graph-utils';
import { useMapPersistence } from '@/hooks/useMapPersistence';
import { NodeQA, NodeSource, SavedMap } from '@/lib/types';

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
  mobile,
}: {
  label: string;
  badge?: string;
  open: boolean;
  onToggle: () => void;
  mobile?: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full px-4 flex items-center gap-1.5 text-2xs font-mono uppercase tracking-wider text-ink-3 hover:text-ink-1 transition-colors ${
        mobile ? 'py-3 min-h-[44px]' : 'py-2'
      }`}
    >
      {open ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
      <span>{label}</span>
      {badge && <span className="font-normal ml-0.5 normal-case">{badge}</span>}
    </button>
  );
}

// Media sub-section with label and loading state
function MediaSubsection({
  title,
  loading: isLoading,
  children,
}: {
  title: string;
  loading: boolean;
  children: ReactNode;
}) {
  const count = Array.isArray(children) ? children.filter(Boolean).length : (children ? 1 : 0);
  if (!isLoading && count === 0) return null;

  return (
    <div>
      <span className="text-2xs font-mono uppercase tracking-wider text-ink-3 block mb-1.5">
        {title}
      </span>
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-ink-3">
          <Loader2 size={12} className="animate-spin" />
          loading...
        </div>
      ) : (
        <div className="space-y-1">{children}</div>
      )}
    </div>
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
    setLinkedMap,
  } = useExploration();
  const { expand } = useNodeExpand();
  const { maps: savedMaps, fetchMaps: fetchSavedMaps } = useMapPersistence();
  const isMobile = useIsMobile();
  const node = nodes.find((n) => n.id === activeNodeId);
  const media = useNodeMedia(node ? node.data.label : null);

  const { sheetStyle, handleProps, snapTo, currentSnap } = useBottomSheet({
    onClose: () => setActiveNode(null),
    initialSnap: 'half',
  });

  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isFetchingSummary, setIsFetchingSummary] = useState(false);

  // Section collapse states
  const [aboutOpen, setAboutOpen] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [connectionsOpen, setConnectionsOpen] = useState(true);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [qaOpen, setQaOpen] = useState(true);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [mapPickerLoaded, setMapPickerLoaded] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef<Set<string>>(new Set());

  // Reset section states when switching nodes
  useEffect(() => {
    setDescExpanded(false);
    setAboutOpen(true);
    setConnectionsOpen(true);
    setMediaOpen(false);
    setQaOpen(true);
    setShowMapPicker(false);
    setMapPickerLoaded(false);
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

  // Auto-fetch summary: try Wikipedia first, fall back to Claude for niche topics
  useEffect(() => {
    if (!node) return;
    if (node.data.summary) return;
    if (fetchedRef.current.has(node.id)) return;
    fetchedRef.current.add(node.id);

    const updateNodeSummary = (
      nodeId: string,
      summary: string,
      url?: string,
      imageUrl?: string,
      summarySource?: 'wikipedia' | 'ai'
    ) => {
      const { nodes: currentNodes } = useExploration.getState();
      const targetNode = currentNodes.find((n) => n.id === nodeId);
      if (targetNode && !targetNode.data.summary) {
        useExploration.setState({
          nodes: currentNodes.map((n) =>
            n.id === nodeId
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    summary,
                    url: url || n.data.url,
                    imageUrl: n.data.imageUrl || imageUrl,
                    summarySource: summarySource || n.data.summarySource,
                  },
                }
              : n
          ),
        });
      }
    };

    const fetchSummary = async () => {
      setIsFetchingSummary(true);
      try {
        // 1. Try Wikipedia first
        const res = await fetch(`/api/wikipedia?title=${encodeURIComponent(node.data.label)}`);
        const wikiData = await res.json();

        if (wikiData.summary?.extract || wikiData.intro) {
          const summaryText = wikiData.intro || wikiData.summary?.extract || '';
          updateNodeSummary(
            node.id,
            summaryText,
            wikiData.summary?.content_urls?.desktop?.page,
            wikiData.summary?.thumbnail?.source,
            'wikipedia'
          );
          return;
        }

        // 2. Wikipedia has nothing — fall back to Claude
        const seedTerm = useExploration.getState().seedTerm;
        const descRes = await fetch('/api/describe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: node.data.label,
            context: seedTerm || undefined,
          }),
        });
        const descData = await descRes.json();
        if (descData.description) {
          updateNodeSummary(node.id, descData.description, undefined, undefined, 'ai');
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

  // Shared content sections
  const panelHeader = (
    <div className={`px-4 py-3 border-b border-surface-2 flex items-start justify-between gap-2 ${isMobile ? 'pt-1' : ''}`}>
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
            className={`text-ink-3 hover:text-red-500 transition-colors ${isMobile ? 'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'p-1'}`}
            title="Remove node"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          onClick={() => setActiveNode(null)}
          className={`text-ink-3 hover:text-ink-0 transition-colors ${isMobile ? 'p-2 min-w-[44px] min-h-[44px] flex items-center justify-center' : 'p-1'}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );

  const panelContent = (
    <div ref={contentRef} className="flex-1 overflow-y-auto min-h-0">
      {/* ── About section ──────────────────────────────── */}
      <div className="border-b border-surface-2">
        <SectionHeader label="about" open={aboutOpen} onToggle={() => setAboutOpen(!aboutOpen)} mobile={isMobile} />

        {aboutOpen && (
          <div className="px-4 pb-3 -mt-0.5">
            {data.summarySource && (
              <span className={`inline-block text-2xs font-mono uppercase tracking-wider px-1.5 py-0.5 mb-2 ${
                data.summarySource === 'wikipedia'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-blue-50 text-blue-700'
              }`}>
                {data.summarySource === 'wikipedia' ? 'WIKIPEDIA' : 'AI SUMMARY'}
              </span>
            )}
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

      {/* ── Media section ──────────────────────────────── */}
      <div className="border-b border-surface-2">
        <SectionHeader label="media" open={mediaOpen} onToggle={() => setMediaOpen(!mediaOpen)} mobile={isMobile} />

        {mediaOpen && (
          <div className="px-4 pb-3 space-y-4 -mt-0.5">
            {/* YouTube */}
            <MediaSubsection title="videos" loading={media.youtube.loading}>
              {media.youtube.results.map((video) => (
                <a
                  key={video.videoId}
                  href={`https://youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex gap-2 hover:bg-surface-0 p-1 transition-colors ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  {video.thumbnailUrl && (
                    <img src={video.thumbnailUrl} alt="" className="w-24 h-[54px] object-cover flex-shrink-0 bg-surface-1" />
                  )}
                  <span className="text-xs text-ink-2 line-clamp-2 leading-tight">{video.title}</span>
                </a>
              ))}
            </MediaSubsection>

            {/* Books */}
            <MediaSubsection title="books" loading={media.books.loading}>
              {media.books.results.map((book) => (
                <a
                  key={book.key}
                  href={`https://openlibrary.org${book.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex gap-2 hover:bg-surface-0 p-1 transition-colors ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  {book.coverUrl && (
                    <img src={book.coverUrl} alt="" className="w-10 h-14 object-cover flex-shrink-0 bg-surface-1" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs text-ink-2 line-clamp-1 block">{book.title}</span>
                    <span className="text-2xs text-ink-3 block">{book.authors.join(', ')}</span>
                    {book.firstPublishYear && (
                      <span className="text-2xs text-ink-3">{book.firstPublishYear}</span>
                    )}
                  </div>
                </a>
              ))}
            </MediaSubsection>

            {/* Podcasts */}
            <MediaSubsection title="podcasts" loading={media.podcasts.loading}>
              {media.podcasts.results.map((pod, i) => (
                <a
                  key={i}
                  href={pod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex gap-2 hover:bg-surface-0 p-1 transition-colors ${isMobile ? 'min-h-[44px]' : ''}`}
                >
                  {pod.imageUrl && (
                    <img src={pod.imageUrl} alt="" className="w-10 h-10 object-cover flex-shrink-0 bg-surface-1" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs text-ink-2 line-clamp-1 block">{pod.title}</span>
                    <span className="text-2xs text-ink-3 line-clamp-1 block">{pod.description}</span>
                  </div>
                </a>
              ))}
            </MediaSubsection>

            {/* Music */}
            <MediaSubsection title="music" loading={media.music.loading}>
              {media.music.results.map((track, i) => (
                <div key={i} className={`flex gap-2 items-center p-1 ${isMobile ? 'min-h-[44px]' : ''}`}>
                  {track.artworkUrl && (
                    <img src={track.artworkUrl} alt="" className="w-10 h-10 flex-shrink-0 bg-surface-1" />
                  )}
                  <div className="min-w-0 flex-1">
                    <a
                      href={track.trackViewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-ink-2 line-clamp-1 block hover:text-accent"
                    >
                      {track.trackName}
                    </a>
                    <span className="text-2xs text-ink-3 block">{track.artistName}</span>
                  </div>
                  {track.previewUrl && (
                    <audio src={track.previewUrl} controls className="h-6 w-20 flex-shrink-0" />
                  )}
                </div>
              ))}
            </MediaSubsection>
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
          mobile={isMobile}
        />

        {connectionsOpen && (
          <div className="px-4 pb-3 -mt-0.5">
            {!data.expanded ? (
              <button
                onClick={handleExpand}
                className={`flex items-center gap-1.5 px-3 bg-ink-0 text-white text-xs hover:bg-ink-1 transition-colors ${
                  isMobile ? 'py-2.5 min-h-[44px]' : 'py-1.5'
                }`}
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
                        className={`w-full text-left px-2 hover:bg-surface-0 transition-colors flex items-start gap-2 ${
                          isMobile ? 'py-2.5 min-h-[44px]' : 'py-1.5'
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${
                            sourceColors[child.data.source]
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs text-ink-2 hover:text-ink-0 truncate block">
                            {child.data.label}
                          </span>
                          {child.data.summary && (
                            <span className="text-2xs text-ink-3 line-clamp-1 block mt-0.5">
                              {child.data.summary.split('.')[0]}.
                            </span>
                          )}
                        </div>
                      </button>
                    )
                )}
              </div>
            ) : (
              <span className="text-xs text-ink-3 italic">no connections yet</span>
            )}

            {/* Link to map */}
            <div className="mt-3 pt-2.5 border-t border-surface-2">
              {data.linkedMapId ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Link2 size={12} className="text-accent" />
                    <span className="text-xs text-ink-2">
                      linked to <span className="font-medium">{data.linkedMapTitle || 'map'}</span>
                    </span>
                    <button
                      onClick={() => setLinkedMap(node.id, '', '')}
                      className="text-2xs text-ink-3 hover:text-red-500 ml-auto"
                    >
                      unlink
                    </button>
                  </div>
                  <button
                    onClick={async () => {
                      // Navigate to the linked map via portal
                      try {
                        const { createClient } = await import('@/lib/supabase/client');
                        const supabase = createClient();
                        const { data: mapData, error } = await supabase
                          .from('maps')
                          .select('*')
                          .eq('id', data.linkedMapId)
                          .single();

                        if (!error && mapData) {
                          const { pushMap } = useExploration.getState();
                          pushMap(mapData);
                        }
                      } catch {
                        // silent fail
                      }
                    }}
                    className={`flex items-center gap-1.5 text-xs px-3 bg-accent text-white hover:opacity-80 transition-colors ${
                      isMobile ? 'py-2 min-h-[36px]' : 'py-1.5'
                    }`}
                  >
                    <Link2 size={12} />
                    go to map
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (!mapPickerLoaded) {
                        fetchSavedMaps();
                        setMapPickerLoaded(true);
                      }
                      setShowMapPicker(!showMapPicker);
                    }}
                    className={`flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink-0 transition-colors ${
                      isMobile ? 'py-1.5 min-h-[36px]' : ''
                    }`}
                  >
                    <Link2 size={12} />
                    link to another map
                  </button>

                  {showMapPicker && (
                    <div className="mt-2 border border-surface-2 max-h-32 overflow-y-auto">
                      {savedMaps.length === 0 ? (
                        <p className="text-2xs text-ink-3 px-3 py-2">no saved maps</p>
                      ) : (
                        savedMaps.map((m) => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setLinkedMap(node.id, m.id, m.title || m.seed_term);
                              setShowMapPicker(false);
                            }}
                            className={`w-full text-left px-3 text-xs text-ink-2 hover:bg-surface-1 transition-colors ${
                              isMobile ? 'py-2 min-h-[36px]' : 'py-1.5'
                            }`}
                          >
                            {m.title || m.seed_term}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
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
          mobile={isMobile}
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
                                  className={`inline-flex items-center gap-1 text-2xs bg-white border border-surface-2 px-2 text-ink-2 hover:border-ink-3 hover:text-ink-0 transition-colors ${
                                    isMobile ? 'py-2 min-h-[36px]' : 'py-1'
                                  }`}
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
                      <div className={`flex gap-2 mt-2 pt-2 border-t border-surface-2 ${isMobile ? 'gap-4' : ''}`}>
                        <button
                          onClick={() => approveAnswer(node.id, qa.id)}
                          className={`flex items-center gap-1 text-2xs text-node-user hover:underline ${isMobile ? 'py-1 min-h-[36px]' : ''}`}
                        >
                          <Check size={10} /> keep
                        </button>
                        <button
                          onClick={() => handleAddToMap(qa)}
                          className={`flex items-center gap-1 text-2xs text-accent hover:underline ${isMobile ? 'py-1 min-h-[36px]' : ''}`}
                        >
                          <MapPin size={10} /> add to map
                        </button>
                        <button
                          onClick={() => rejectAnswer(node.id, qa.id)}
                          className={`flex items-center gap-1 text-2xs text-ink-3 hover:text-red-500 ${isMobile ? 'py-1 min-h-[36px]' : ''}`}
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
                          className={`flex items-center gap-1 text-accent hover:underline ml-auto ${isMobile ? 'py-1 min-h-[36px]' : ''}`}
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
  );

  const panelInput = (
    <div className="px-4 py-3 border-t border-surface-2 flex-shrink-0 bg-white">
      <form onSubmit={handleAsk} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="ask about this topic..."
          disabled={isAsking}
          className={`flex-1 bg-surface-1 border border-surface-2 text-xs text-ink-1 px-3 placeholder:text-ink-3 focus:outline-none focus:border-ink-3 transition-colors ${
            isMobile ? 'py-3 text-base' : 'py-2'
          }`}
          style={isMobile ? { fontSize: '16px' } : undefined}
        />
        <button
          type="submit"
          disabled={isAsking || !question.trim()}
          className={`bg-ink-0 text-white hover:bg-ink-1 disabled:opacity-30 transition-colors ${
            isMobile ? 'p-3 min-w-[44px] min-h-[44px]' : 'p-2'
          }`}
        >
          <Send size={isMobile ? 16 : 12} />
        </button>
      </form>
    </div>
  );

  // ── Mobile: Bottom Sheet ──────────────────────────────
  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setActiveNode(null)}
        />

        {/* Bottom Sheet */}
        <div
          className="fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-lg flex flex-col"
          style={{
            ...sheetStyle,
            height: '92vh',
          }}
        >
          {/* Drag handle */}
          <div
            className="flex justify-center py-2 cursor-grab active:cursor-grabbing touch-none"
            {...handleProps}
          >
            <div className="w-10 h-1 bg-surface-3 rounded-full" />
          </div>

          {panelHeader}
          {panelContent}
          {panelInput}
        </div>
      </>
    );
  }

  // ── Desktop: Side Panel ───────────────────────────────
  return (
    <div className="animate-slide-in absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white border-l border-surface-2 flex flex-col z-50">
      {panelHeader}
      {panelContent}
      {panelInput}
    </div>
  );
}
