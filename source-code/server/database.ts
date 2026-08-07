import Database from 'better-sqlite3';
import path from 'path';
import { Note, KnowledgeGraph, OutlineItem } from './types';

const DB_PATH = path.join(process.cwd(), 'notes', 'knowledge-hub.db');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables();
  }
  return db;
}

function initTables() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      domain TEXT DEFAULT 'general',
      source TEXT DEFAULT 'upload',
      source_url TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS knowledge_graphs (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      graph_data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outlines (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      outline_data TEXT NOT NULL,
      source_note_ids TEXT DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS video_favorites (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT DEFAULT '',
      author TEXT DEFAULT '',
      cover_url TEXT,
      duration TEXT,
      tags TEXT DEFAULT '[]',
      imported_at TEXT NOT NULL
    );
  `);
}

// ==================== Notes CRUD ====================

export function createNote(note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>): Note {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const tags = JSON.stringify(note.tags || []);

  database.prepare(`
    INSERT INTO notes (id, title, content, tags, domain, source, source_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, note.title, note.content, tags, note.domain, note.source, note.sourceUrl || null, now, now);

  return { ...note, id, createdAt: now, updatedAt: now, tags: note.tags || [] };
}

export function getNotes(): Note[] {
  const database = getDb();
  const rows = database.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all() as any[];
  return rows.map(mapNote);
}

export function getNoteById(id: string): Note | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM notes WHERE id = ?').get(id) as any;
  return row ? mapNote(row) : null;
}

export function updateNote(id: string, updates: Partial<Note>): Note | null {
  const database = getDb();
  const now = new Date().toISOString();
  const existing = getNoteById(id);
  if (!existing) return null;

  const title = updates.title ?? existing.title;
  const content = updates.content ?? existing.content;
  const tags = JSON.stringify(updates.tags ?? existing.tags);
  const domain = updates.domain ?? existing.domain;

  database.prepare(`
    UPDATE notes SET title = ?, content = ?, tags = ?, domain = ?, updated_at = ?
    WHERE id = ?
  `).run(title, content, tags, domain, now, id);

  return { ...existing, title, content, tags: updates.tags ?? existing.tags, domain, updatedAt: now };
}

export function deleteNote(id: string): boolean {
  const database = getDb();
  const result = database.prepare('DELETE FROM notes WHERE id = ?').run(id);
  return result.changes > 0;
}

export function searchNotes(query: string): Note[] {
  const database = getDb();
  const rows = database.prepare(
    `SELECT * FROM notes WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY updated_at DESC`
  ).all(`%${query}%`, `%${query}%`, `%${query}%`) as any[];
  return rows.map(mapNote);
}

// ==================== Knowledge Graph ====================

export function saveKnowledgeGraph(userId: string, graphData: KnowledgeGraph): KnowledgeGraph {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Upsert: replace existing graph for this user
  const existing = database.prepare('SELECT id FROM knowledge_graphs WHERE user_id = ?').get(userId);

  if (existing) {
    database.prepare(`
      UPDATE knowledge_graphs SET graph_data = ?, updated_at = ? WHERE user_id = ?
    `).run(JSON.stringify(graphData), now, userId);
  } else {
    database.prepare(`
      INSERT INTO knowledge_graphs (id, user_id, graph_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, userId, JSON.stringify(graphData), now, now);
  }

  return graphData;
}

export function getKnowledgeGraph(userId: string): KnowledgeGraph | null {
  const database = getDb();
  const row = database.prepare('SELECT * FROM knowledge_graphs WHERE user_id = ?').get(userId) as any;
  if (!row) return null;
  return JSON.parse(row.graph_data);
}

// ==================== Outlines ====================

export function saveOutline(title: string, outlineData: OutlineItem[], sourceNoteIds: string[]): OutlineItem[] {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO outlines (id, title, outline_data, source_note_ids, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, JSON.stringify(outlineData), JSON.stringify(sourceNoteIds), now, now);

  return outlineData;
}

export function getOutlines(): any[] {
  const database = getDb();
  return database.prepare('SELECT * FROM outlines ORDER BY created_at DESC').all();
}

// ==================== Video Favorites ====================

/** 清空指定平台的全部视频收藏 */
export function clearVideoFavorites(platform: string): number {
  const database = getDb();
  const result = database.prepare('DELETE FROM video_favorites WHERE platform = ?').run(platform);
  return result.changes;
}

export function saveVideoFavorite(video: Omit<any, 'id' | 'importedAt'>): any {
  const database = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const tags = JSON.stringify(video.tags || []);

  database.prepare(`
    INSERT OR REPLACE INTO video_favorites (id, platform, title, url, description, author, cover_url, duration, tags, imported_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, video.platform, video.title, video.url, video.description, video.author, video.coverUrl || null, video.duration || null, tags, now);

  return { ...video, id, importedAt: now };
}

export function getVideoFavorites(platform?: string): any[] {
  const database = getDb();
  if (platform) {
    return database.prepare('SELECT * FROM video_favorites WHERE platform = ? ORDER BY imported_at DESC').all(platform);
  }
  return database.prepare('SELECT * FROM video_favorites ORDER BY imported_at DESC').all();
}

// ==================== Helper ====================

function mapNote(row: any): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: JSON.parse(row.tags || '[]'),
    domain: row.domain,
    source: row.source,
    sourceUrl: row.source_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
