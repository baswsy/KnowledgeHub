import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { query } from '@tencent-ai/agent-sdk';
import { processAgentRequest, parseStructuredResult } from './agent';
import * as db from './database';
import { AgentRequest, ChatMessage } from './types';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const PORT = process.env.PORT || 3001;

// ==================== Express 中间件 ====================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// 上传配置
const uploadDir = path.join(__dirname, '..', 'notes', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8'));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// ==================== REST API 路由 ====================

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== 笔记管理 =====

app.get('/api/notes', (_req, res) => {
  const notes = db.getNotes();
  res.json(notes);
});

app.get('/api/notes/search', (req, res) => {
  const query = req.query.q as string;
  if (!query) {
    return res.json(db.getNotes());
  }
  const results = db.searchNotes(query);
  res.json(results);
});

app.get('/api/notes/:id', (req, res) => {
  const note = db.getNoteById(req.params.id);
  if (!note) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  res.json(note);
});

app.post('/api/notes', upload.single('file'), async (req, res) => {
  try {
    let title = req.body.title || '未命名笔记';
    let content = req.body.content || '';
    let tags: string[] = [];
    let domain = req.body.domain || 'general';

    // 处理文件上传
    if (req.file) {
      title = req.body.title || req.file.originalname;
      const fileContent = fs.readFileSync(req.file.path, 'utf-8');
      content = fileContent;

      // 清理上传的临时文件（内容已读入）
      fs.unlinkSync(req.file.path);
    }

    // 解析 tags
    if (req.body.tags) {
      try {
        tags = typeof req.body.tags === 'string' ? JSON.parse(req.body.tags) : req.body.tags;
      } catch {
        tags = req.body.tags.split(',').map((t: string) => t.trim());
      }
    }

    // 使用 Agent 自动分析笔记并提取元数据
    if (content.length > 50 && !req.body.skipAnalysis) {
      try {
        const analysisPrompt = `请分析以下笔记内容，返回 JSON 格式的分析结果（只返回 JSON，不要其他内容）：
{
  "domain": "所属知识领域（如：计算机科学、历史、文学、哲学、自然科学等）",
  "tags": ["相关标签1", "标签2", "标签3"],
  "summary": "100字以内的内容摘要"
}

笔记内容：
标题：${title}
${content.slice(0, 3000)}`;

        const analysisResponse = await query({
          prompt: analysisPrompt,
          options: {
            maxTurns: 1,
            permissionMode: 'bypassPermissions',
          },
        });

        const analysisText = extractText(analysisResponse);
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const analysis = JSON.parse(jsonMatch[0]);
            domain = analysis.domain || domain;
            if (analysis.tags && Array.isArray(analysis.tags)) {
              tags = [...new Set([...tags, ...analysis.tags])];
            }
          } catch { /* 解析失败使用默认值 */ }
        }
      } catch { /* Agent 分析失败不影响笔记创建 */ }
    }

    const note = db.createNote({
      title,
      content,
      tags,
      domain,
      source: 'upload',
    });

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/notes/text', async (req, res) => {
  try {
    const { title, content, tags, domain } = req.body;
    if (!content) {
      return res.status(400).json({ error: '内容不能为空' });
    }

    const note = db.createNote({
      title: title || '未命名笔记',
      content,
      tags: tags || [],
      domain: domain || 'general',
      source: 'upload',
    });

    res.json(note);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notes/:id', (req, res) => {
  const updated = db.updateNote(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: '笔记不存在' });
  }
  res.json(updated);
});

app.delete('/api/notes/:id', (req, res) => {
  const deleted = db.deleteNote(req.params.id);
  res.json({ success: deleted });
});

// ===== 知识图谱 =====

app.get('/api/graph', (_req, res) => {
  const graph = db.getKnowledgeGraph('default');
  res.json(graph || { nodes: [], edges: [] });
});

// ===== 大纲 =====

app.get('/api/outlines', (_req, res) => {
  const outlines = db.getOutlines();
  res.json(outlines);
});

// ===== 视频收藏 =====

app.get('/api/favorites', (req, res) => {
  const platform = req.query.platform as string | undefined;
  const favorites = db.getVideoFavorites(platform);
  res.json(favorites);
});

/**
 * 通过 B站公开 API 获取收藏夹数据
 * 
 * 使用说明：
 * - 用户需要将视频收藏到公开收藏夹（隐私设为"公开"）
 * - 提供 B站 UID 和收藏夹名称即可
 * 
 * API 调用链：
 * 1. 获取用户公开收藏夹列表 → 根据名称模糊匹配 media_id
 * 2. 分页获取收藏夹内视频 → 保存到数据库
 */
app.get('/api/favorites/fetch', async (req, res) => {
  try {
    const uid = (req.query.uid as string || '').trim();
    const favName = (req.query.name as string || '').trim();

    if (!uid) {
      return res.status(400).json({ error: '请提供B站UID' });
    }
    if (!favName) {
      return res.status(400).json({ error: '请提供收藏夹名称' });
    }

    // 步骤1: 获取用户公开收藏夹列表
    const foldersUrl = `https://api.bilibili.com/x/v3/fav/folder/created/list-all?up_mid=${uid}&jsonp=jsonp`;
    const foldersRes = await fetch(foldersUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://space.bilibili.com/',
      },
    });

    if (!foldersRes.ok) {
      return res.status(502).json({ error: 'B站API请求失败，请稍后重试' });
    }

    const foldersData: any = await foldersRes.json();

    if (foldersData.code !== 0) {
      return res.status(400).json({ 
        error: `获取收藏夹列表失败: ${foldersData.message || '请确认UID是否正确'}`,
        hint: '请确保提供的UID正确，且至少有一个公开收藏夹',
      });
    }

    const folders = foldersData.data?.list || [];
    if (folders.length === 0) {
      return res.status(400).json({ 
        error: '该用户没有公开收藏夹',
        hint: '请先在B站创建一个公开收藏夹，将需要分析的视频收藏进去',
      });
    }

    // 模糊匹配收藏夹名称
    const targetFolder = folders.find((f: any) =>
      f.title && f.title.toLowerCase().includes(favName.toLowerCase())
    ) || folders.find((f: any) =>
      f.title && favName.toLowerCase().includes(f.title.toLowerCase())
    );

    if (!targetFolder) {
      const availableNames = folders.map((f: any) => f.title).join('、');
      return res.status(404).json({
        error: `未找到名为"${favName}"的收藏夹`,
        hint: `可用的公开收藏夹: ${availableNames}`,
        availableFolders: folders.map((f: any) => ({ id: f.id, title: f.title, count: f.media_count })),
      });
    }

    // 步骤2: 分页获取收藏夹内所有视频
    const mediaId = targetFolder.id;
    const pageSize = 20;
    let allVideos: any[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const videosUrl = `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${mediaId}&pn=${page}&ps=${pageSize}&platform=web&jsonp=jsonp`;
      const videosRes = await fetch(videosUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com/',
        },
      });

      if (!videosRes.ok) {
        return res.status(502).json({ error: 'B站视频列表API请求失败' });
      }

      const videosData: any = await videosRes.json();

      if (videosData.code !== 0) {
        return res.status(400).json({ error: `获取视频列表失败: ${videosData.message}` });
      }

      const medias = videosData.data?.medias || [];
      if (medias.length === 0) {
        hasMore = false;
        break;
      }

      for (const item of medias) {
        allVideos.push({
          title: item.title || '未知标题',
          url: item.link || `https://www.bilibili.com/video/${item.bvid}`,
          author: item.upper?.name || '',
          description: item.intro || '',
          coverUrl: item.cover || '',
          duration: item.duration ? String(item.duration) : '',
          tags: [],
        });
      }

      // 判断是否还有下一页
      const total = videosData.data?.info?.media_count || 0;
      if (allVideos.length >= total || medias.length < pageSize) {
        hasMore = false;
      } else {
        page++;
      }
    }

    if (allVideos.length === 0) {
      return res.status(400).json({ error: `收藏夹"${targetFolder.title}"中没有视频` });
    }

    // 保存到数据库
    const platform = 'bilibili';
    db.clearVideoFavorites(platform);
    for (const v of allVideos) {
      db.saveVideoFavorite({
        platform,
        title: v.title,
        url: v.url || '',
        description: v.description || '',
        author: v.author || '',
        coverUrl: v.coverUrl || '',
        duration: v.duration || '',
        tags: v.tags || [],
      });
    }

    const favorites = db.getVideoFavorites(platform);

    res.json({
      success: true,
      count: favorites.length,
      platform,
      folderName: targetFolder.title,
      favorites,
      message: `成功从收藏夹"${targetFolder.title}"导入 ${favorites.length} 个视频`,
    });
  } catch (error: any) {
    console.error('获取B站收藏失败:', error);
    res.status(500).json({ error: error.message || '获取失败，请重试' });
  }
});

/** 清空指定平台的收藏 */
app.delete('/api/favorites', (req, res) => {
  const platform = req.query.platform as string;
  if (!platform) {
    return res.status(400).json({ error: '请指定平台' });
  }
  db.clearVideoFavorites(platform);
  res.json({ success: true, message: `已清空 ${platform} 收藏数据` });
});

// ==================== WebSocket 处理 ====================

wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket 客户端已连接');

  ws.on('message', async (rawData: Buffer) => {
    try {
      const message = JSON.parse(rawData.toString());

      if (message.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      // 创建 Agent 请求
      const agentReq: AgentRequest = {
        type: message.action || 'chat',
        message: message.content || '',
        noteIds: message.noteIds,
        platform: message.platform,
        options: message.options,
      };

      // 发送开始信号
      ws.send(JSON.stringify({
        id: crypto.randomUUID(),
        role: 'system',
        content: `处理 ${agentReq.type} 请求中...`,
        timestamp: new Date().toISOString(),
        type: 'status',
      }));

      // 调用 Agent 处理
      const result = await processAgentRequest(agentReq);
      const parsed = parseStructuredResult(result);

      // 构建响应消息
      const responseMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: parsed.message,
        timestamp: new Date().toISOString(),
        type: parsed.type,
        data: parsed.data,
      };

      ws.send(JSON.stringify(responseMsg));

      // 如果是知识图谱，发送独立的 graph 事件
      if (parsed.type === 'graph' && parsed.data) {
        ws.send(JSON.stringify({
          type: 'graph_update',
          data: parsed.data,
        }));
      }

    } catch (error: any) {
      ws.send(JSON.stringify({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `处理出错: ${error.message}`,
        timestamp: new Date().toISOString(),
        type: 'text',
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket 客户端断开连接');
  });

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
});

// ==================== 静态文件回退 ====================

if (fs.existsSync(clientDist)) {
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// ==================== 启动服务器 ====================

server.listen(PORT, () => {
  console.log(`KnowledgeHub 服务器已启动: http://localhost:${PORT}`);
  console.log(`WebSocket 服务: ws://localhost:${PORT}`);
});

// ==================== 辅助函数 ====================

function extractText(response: any): string {
  if (typeof response === 'string') return response;
  if (response?.result) return response.result;
  if (response?.text) return response.text;
  if (response?.content) {
    if (Array.isArray(response.content)) {
      return response.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text).join('\n');
    }
    return response.content;
  }
  return JSON.stringify(response);
}

// ==================== 启动服务器 ============================
