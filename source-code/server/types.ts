export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  domain: string;
  source: 'upload' | 'bilibili' | 'agent';
  sourceUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  group: string;        // 领域分类
  type: 'concept' | 'note' | 'video' | 'source';
  weight: number;        // 重要度
  url?: string;
}

export interface KnowledgeEdge {
  id: string;
  source: string;
  target: string;
  label: string;         // 关系描述
  strength: number;      // 关系强度
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
  sourceIds: string[];   // 关联的知识点 ID
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  type?: 'text' | 'graph' | 'outline' | 'video_suggest';
  data?: KnowledgeGraph | OutlineItem[] | any;
}

export interface VideoFavorite {
  id: string;
  platform: 'bilibili';
  title: string;
  url: string;
  description: string;
  author: string;
  coverUrl?: string;
  duration?: string;
  tags: string[];
}

export interface AgentRequest {
  type: 'chat' | 'research' | 'analyze_notes' | 'fetch_favorites' | 'generate_graph' | 'generate_outline';
  message: string;
  noteIds?: string[];
  platform?: 'bilibili';
  options?: Record<string, any>;
}
