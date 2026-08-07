export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  domain: string;
  source: string;
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  group: string;
  type: 'concept' | 'note' | 'video' | 'source';
  weight: number;
  url?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  strength: number;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface OutlineItem {
  id: string;
  title: string;
  level: number;
  content: string;
  children: OutlineItem[];
  sourceIds: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'graph' | 'outline' | 'video_suggest' | 'status';
  data?: any;
}

export type ViewTab = 'chat' | 'notes' | 'graph' | 'outline' | 'favorites';
