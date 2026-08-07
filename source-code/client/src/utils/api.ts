// 自动检测后端地址
const getBackendHost = () => {
  if (import.meta.env.VITE_API_HOST) return import.meta.env.VITE_API_HOST;
  return window.location.host;
};
const WS_URL = import.meta.env.VITE_WS_URL ||
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + getBackendHost();
const API_BASE = import.meta.env.VITE_API_URL ||
  window.location.protocol + '//' + getBackendHost() + '/api';

// 后端是否可用（false 时使用 localStorage 离线模式）
let backendAvailable = false;

// ==================== 本地离线存储（后端不可用时的 fallback） ====================
const LS_KEYS = {
  notes: 'kh_offline_notes',
  graph: 'kh_offline_graph',
  outlines: 'kh_offline_outlines',
  favorites: 'kh_offline_favorites',
};

function loadFromLS(key: string, fallback: any = []) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveToLS(key: string, data: any) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch { /* 忽略 */ }
}

// ==================== WebSocket 客户端 ====================

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: number | null = null;
  private isConnected = false;

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    try {
      this.ws = new WebSocket(WS_URL);
      this.ws.onopen = () => {
        this.isConnected = true;
        backendAvailable = true;
        this.emit('connected', {});
      };
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'graph_update') this.emit('graph_update', data.data);
          else if (data.type !== 'pong') this.emit('message', data);
        } catch { /* ignore */ }
      };
      this.ws.onclose = () => {
        this.isConnected = false;
        this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
        this.emit('disconnected', {});
      };
      this.ws.onerror = () => {};
    } catch {
      this.reconnectTimer = window.setTimeout(() => this.connect(), 3000);
    }
  }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.isConnected = false;
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => { this.listeners.get(event)?.delete(callback); };
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }

  get connected() { return this.isConnected; }
}

export const wsClient = new WebSocketClient();

// ==================== REST API（带离线 fallback） ====================

async function safeFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const api = {
  // 笔记
  async getNotes() {
    try {
      const data = await safeFetch(`${API_BASE}/notes`);
      backendAvailable = true;
      return data;
    } catch {
      return loadFromLS(LS_KEYS.notes, []);
    }
  },

  async getNote(id: string) {
    try {
      return await safeFetch(`${API_BASE}/notes/${id}`);
    } catch {
      const notes = loadFromLS(LS_KEYS.notes, []);
      return notes.find((n: any) => n.id === id) || null;
    }
  },

  async createNoteText(title: string, content: string, tags: string[] = [], domain: string = 'general') {
    try {
      const data = await safeFetch(`${API_BASE}/notes/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, tags, domain }),
      });
      backendAvailable = true;
      return data;
    } catch {
      // 离线模式：保存到 localStorage
      const notes = loadFromLS(LS_KEYS.notes, []);
      const note = {
        id: 'local_' + Date.now(),
        title: title || '未命名笔记',
        content,
        tags,
        domain,
        summary: content.slice(0, 100),
        source: 'offline',
        created_at: new Date().toISOString(),
      };
      notes.unshift(note);
      saveToLS(LS_KEYS.notes, notes);
      return note;
    }
  },

  async uploadNote(file: File, title?: string) {
    const content = await file.text();
    return this.createNoteText(title || file.name, content);
  },

  async deleteNote(id: string) {
    try {
      const data = await safeFetch(`${API_BASE}/notes/${id}`, { method: 'DELETE' });
      backendAvailable = true;
      return data;
    } catch {
      const notes = loadFromLS(LS_KEYS.notes, []).filter((n: any) => n.id !== id);
      saveToLS(LS_KEYS.notes, notes);
      return { success: true };
    }
  },

  async searchNotes(q: string) {
    try {
      return await safeFetch(`${API_BASE}/notes/search?q=${encodeURIComponent(q)}`);
    } catch {
      const notes = loadFromLS(LS_KEYS.notes, []);
      if (!q) return notes;
      const lower = q.toLowerCase();
      return notes.filter((n: any) =>
        n.title?.toLowerCase().includes(lower) ||
        n.content?.toLowerCase().includes(lower) ||
        n.tags?.some((t: string) => t.toLowerCase().includes(lower))
      );
    }
  },

  // 知识图谱
  async getGraph() {
    try { return await safeFetch(`${API_BASE}/graph`); }
    catch { return loadFromLS(LS_KEYS.graph, { nodes: [], edges: [] }); }
  },

  // 大纲
  async getOutlines() {
    try { return await safeFetch(`${API_BASE}/outlines`); }
    catch { return loadFromLS(LS_KEYS.outlines, []); }
  },

  // 收藏夹
  async getFavorites(platform?: string) {
    try {
      const url = platform ? `${API_BASE}/favorites?platform=${platform}` : `${API_BASE}/favorites`;
      return await safeFetch(url);
    } catch { return loadFromLS(LS_KEYS.favorites, []); }
  },

  async clearFavorites(platform: string) {
    try {
      const data = await safeFetch(`${API_BASE}/favorites?platform=${encodeURIComponent(platform)}`, { method: 'DELETE' });
      backendAvailable = true;
      return data;
    } catch {
      // 离线模式：清空本地存储
      const old = loadFromLS(LS_KEYS.favorites, []);
      const filtered = old.filter((f: any) => f.platform !== platform);
      saveToLS(LS_KEYS.favorites, filtered);
      return { success: true };
    }
  },

  /** 通过 B站公开API 获取用户收藏夹数据 */
  async fetchBilibiliFavorites(uid: string, favName: string) {
    const url = `${API_BASE}/favorites/fetch?uid=${encodeURIComponent(uid)}&name=${encodeURIComponent(favName)}`;
    const data = await safeFetch(url);
    backendAvailable = true;
    return data;
  },

  // 后端是否可用
  isBackendAvailable() { return backendAvailable; },
};
