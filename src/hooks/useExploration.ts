import { create } from 'zustand';
import { GraphNode, GraphEdge, PathStep, NodeQA, SavedMap, ViewMode } from '@/lib/types';
import { getDescendantIds } from '@/lib/graph-utils';

export type PanelSnap = 'peek' | 'half' | 'full' | 'closed';

interface ExplorationState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  path: PathStep[];
  activeNodeId: string | null;
  viewMode: ViewMode;
  isLoading: boolean;
  seedTerm: string;
  panelSnapPoint: PanelSnap;
  centerNodeId: string | null;
  currentMapId: string | null;
  mapStack: { mapId: string; seedTerm: string }[];

  setSeedTerm: (term: string) => void;
  startSearch: (term: string) => void;
  addNodes: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  expandNode: (nodeId: string) => void;
  setActiveNode: (nodeId: string | null) => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setPanelSnapPoint: (snap: PanelSnap) => void;
  setCenterNodeId: (nodeId: string | null) => void;
  setCurrentMapId: (id: string | null) => void;
  reset: () => void;
  loadMap: (map: SavedMap) => void;
  addConversation: (nodeId: string, qa: NodeQA) => void;
  approveAnswer: (nodeId: string, qaId: string) => void;
  rejectAnswer: (nodeId: string, qaId: string) => void;
  removeNode: (nodeId: string) => void;
  setLinkedMap: (nodeId: string, mapId: string, mapTitle: string) => void;
  pushMap: (map: SavedMap) => void;
  popMap: () => { mapId: string; seedTerm: string } | null;
}

const initialState = {
  nodes: [] as GraphNode[],
  edges: [] as GraphEdge[],
  path: [] as PathStep[],
  activeNodeId: null as string | null,
  viewMode: 'graph' as const,
  isLoading: false,
  seedTerm: '',
  panelSnapPoint: 'half' as PanelSnap,
  centerNodeId: null as string | null,
  currentMapId: null as string | null,
  mapStack: [] as { mapId: string; seedTerm: string }[],
};

export const useExploration = create<ExplorationState>((set, get) => ({
  ...initialState,

  setSeedTerm: (term) => set({ seedTerm: term }),

  startSearch: (term) => set({
    ...initialState,
    seedTerm: term,
    isLoading: true,
  }),

  addNodes: (nodes, edges) =>
    set((state) => ({
      nodes: [...state.nodes, ...nodes],
      edges: [...state.edges, ...edges],
    })),

  expandNode: (nodeId) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      if (!node) return state;
      return {
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? { ...n, data: { ...n.data, expanded: true } }
            : n
        ),
        path: [
          ...state.path,
          { nodeId, label: node.data.label, timestamp: Date.now() },
        ],
      };
    }),

  setActiveNode: (nodeId) => set({ activeNodeId: nodeId }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setLoading: (loading) => set({ isLoading: loading }),

  setPanelSnapPoint: (snap) => set({ panelSnapPoint: snap }),

  setCenterNodeId: (nodeId) => set({ centerNodeId: nodeId }),

  setCurrentMapId: (id) => set({ currentMapId: id }),

  reset: () => set(initialState),

  loadMap: (map) =>
    set({
      nodes: map.nodes,
      edges: map.edges,
      path: map.path,
      seedTerm: map.seed_term,
      viewMode: map.view_mode,
      activeNodeId: null,
      isLoading: false,
      currentMapId: map.id,
    }),

  addConversation: (nodeId, qa) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                conversations: [...n.data.conversations, qa],
              },
            }
          : n
      ),
    })),

  approveAnswer: (nodeId, qaId) =>
    set((state) => ({
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const conversations = n.data.conversations.map((qa) =>
          qa.id === qaId ? { ...qa, approved: true } : qa
        );
        const enrichedContent = conversations
          .filter((qa) => qa.approved)
          .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
          .join('\n\n');
        return {
          ...n,
          data: { ...n.data, conversations, enrichedContent },
        };
      }),
    })),

  rejectAnswer: (nodeId, qaId) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                conversations: n.data.conversations.filter(
                  (qa) => qa.id !== qaId
                ),
              },
            }
          : n
      ),
    })),

  removeNode: (nodeId) =>
    set((state) => {
      // Remove this node and all its descendants
      const toRemove = getDescendantIds(nodeId, state.edges);
      toRemove.add(nodeId);

      return {
        nodes: state.nodes.filter((n) => !toRemove.has(n.id)),
        edges: state.edges.filter(
          (e) => !toRemove.has(e.source) && !toRemove.has(e.target)
        ),
        activeNodeId:
          state.activeNodeId && toRemove.has(state.activeNodeId)
            ? null
            : state.activeNodeId,
      };
    }),

  setLinkedMap: (nodeId, mapId, mapTitle) =>
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, linkedMapId: mapId, linkedMapTitle: mapTitle } }
          : n
      ),
    })),

  pushMap: (map) =>
    set((state) => ({
      mapStack: [
        ...state.mapStack,
        {
          mapId: state.currentMapId || 'unsaved',
          seedTerm: state.seedTerm,
        },
      ],
      nodes: map.nodes,
      edges: map.edges,
      path: map.path,
      seedTerm: map.seed_term,
      viewMode: map.view_mode,
      activeNodeId: null,
      isLoading: false,
      currentMapId: map.id,
    })),

  popMap: () => {
    const { mapStack } = get();
    if (mapStack.length === 0) return null;
    const top = mapStack[mapStack.length - 1];
    set({ mapStack: mapStack.slice(0, -1) });
    return top;
  },
}));
