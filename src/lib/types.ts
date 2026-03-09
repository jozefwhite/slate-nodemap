export type NodeSource = 'wikipedia' | 'dictionary' | 'wikidata' | 'image' | 'user';

export interface NodeQA {
  id: string;
  question: string;
  answer: string;
  approved: boolean;
  timestamp: number;
  suggestedTopics?: string[];
}

export interface ConceptNodeData {
  id: string;
  label: string;
  source: NodeSource;
  summary?: string;
  imageUrl?: string;
  tags: string[];
  url?: string;
  expanded: boolean;
  depth: number;
  createdAt: string;
  conversations: NodeQA[];
  enrichedContent?: string;
}

export interface GraphNode {
  id: string;
  type: 'concept' | 'image';
  position: { x: number; y: number };
  data: ConceptNodeData;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
}

export interface PathStep {
  nodeId: string;
  label: string;
  timestamp: number;
}

export interface SavedMap {
  id: string;
  user_id: string;
  title: string;
  seed_term: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  path: PathStep[];
  view_mode: 'graph' | 'moodboard';
  created_at: string;
  updated_at: string;
  thumbnail_url?: string;
}

export interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls?: {
    desktop?: {
      page?: string;
    };
  };
}

export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: {
      definition: string;
      synonyms: string[];
      antonyms: string[];
    }[];
    synonyms: string[];
    antonyms: string[];
  }[];
}

export interface AskContext {
  question: string;
  currentNode: {
    label: string;
    source: NodeSource;
    summary?: string;
    enrichedContent?: string;
    conversations: { question: string; answer: string }[];
  };
  journeyPath: {
    label: string;
    context: string;
  }[];
}

export interface ClassifyRequest {
  text?: string;
  imageBase64?: string;
  userNotes?: string;
  journeyContext?: {
    seedTerm: string;
    recentNodes: { label: string; summary?: string }[];
  };
  mode: 'classify' | 'analyze';
}

export interface ClassifyResponse {
  description: string;
  analysis: string | null;
  tags: string[];
  relatedConcepts: string[];
}
