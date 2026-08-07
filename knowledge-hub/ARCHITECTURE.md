# 系统架构文档

## 概述

KnowledgeHub 是一个 AI 驱动的知识管理平台，采用**前后端分离**架构，前端可独立部署为静态站点（GitHub Pages），后端提供 REST API + WebSocket 实时通信。

## 架构图

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │              React 18 SPA (Vite 5)                 │  │
│  │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐  │  │
│  │  │ Chat │ │Notes │ │Graph │ │Outline│ │Favorites│ │  │
│  │  │Panel │ │Mgr   │ │View  │ │Panel │ │Panel   │  │  │
│  │  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └───┬────┘  │  │
│  │     │        │        │        │         │        │  │
│  │  ┌──┴────────┴────────┴────────┴─────────┴────┐   │  │
│  │  │         api.ts (统一 API 层)                 │   │  │
│  │  │  REST fetch │ WebSocket Client │ localStorage│   │  │
│  │  └─────────────┴───────────────────┴────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
     ┌──────▼──────┐      ┌──────▼──────┐
     │  REST API   │      │  WebSocket  │
     │  (Express)  │      │  (ws)       │
     └──────┬──────┘      └──────┬──────┘
            │                    │
     ┌──────┴────────────────────┴──────┐
     │        Agent 调度层 (agent.ts)     │
     │  chat │ research │ graph │ outline│
     └────────────────┬──────────────────┘
                      │
     ┌────────────────┴──────────────────┐
     │    CodeBuddy Agent SDK             │
     │    @tencent-ai/agent-sdk           │
     └────────────────┬──────────────────┘
                      │
     ┌────────────────┴──────────────────┐
     │    SQLite (better-sqlite3)          │
     │    notes │ graph │ outline │ fav    │
     └─────────────────────────────────────┘
```

## 核心设计决策

### 1. 双模式运行

| 模式 | 前端 | 后端 | 数据存储 |
|------|------|------|----------|
| **全功能模式** | 连接后端 | Express + WebSocket 运行中 | SQLite |
| **离线模式** | 独立运行 | 无 | localStorage |

前端 `api.ts` 中所有 API 调用均实现 `try-catch`，后端不可用时自动降级到 `localStorage`。

### 2. Agent 调度层 (`server/agent.ts`)

六种处理模式，每种有独立的 system prompt 和配置：

| 模式 | maxTurns | 核心能力 |
|------|----------|----------|
| `chat` | 3 | 基于笔记上下文的智能对话 |
| `research` | 5 | 深度研究分析 |
| `analyze_notes` | 3 | 批量笔记分析 + 结构化报告 |
| `generate_graph` | 5 | 生成 10-30 节点的知识图谱 JSON |
| `generate_outline` | 5 | 生成 2-3 层结构化大纲 |
| `fetch_favorites` | 8 | 引导用户提供收藏夹链接并分析 |

### 3. 实时通信 (WebSocket)

```
Client                          Server
  │                               │
  │──── ping ────────────────────►│
  │◄─── pong ──────────────────────│
  │                               │
  │──── {action:"chat", ...} ────►│
  │◄─── {type:"status", ...} ──────│  ← 处理开始
  │◄─── {type:"text", ...} ────────│  ← Agent 回复
  │◄─── {type:"graph_update", ...}──│  ← 知识图谱更新
```

### 4. 数据库设计 (`server/database.ts`)

4 张表，均走 SQLite WAL 模式：

```sql
notes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  tags TEXT,          -- JSON array
  domain TEXT,
  source TEXT,
  source_url TEXT,
  summary TEXT,
  created_at TEXT,
  updated_at TEXT
)

knowledge_graphs (
  id TEXT PRIMARY KEY,
  user_id TEXT DEFAULT 'default',
  graph_data TEXT,    -- JSON: {nodes:[], edges:[]}
  created_at TEXT,
  updated_at TEXT
)

outlines (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  outline_data TEXT,   -- JSON: 结构化大纲
  source_note_ids TEXT, -- JSON array
  created_at TEXT,
  updated_at TEXT
)

video_favorites (
  id TEXT PRIMARY KEY,
  platform TEXT,       -- 'bilibili' | 'douyin'
  title TEXT,
  url TEXT,
  description TEXT,
  author TEXT,
  cover_url TEXT,
  duration TEXT,
  tags TEXT,           -- JSON array
  imported_at TEXT
)
```

## 前端组件树

```
App (状态管理 + WebSocket 生命周期)
├── Sidebar (导航 + 状态指示)
├── ChatPanel (AI 对话)
│   ├── 快捷操作按钮 (5 个)
│   ├── 深度研究开关
│   └── 欢迎引导页 (3 功能卡片)
├── NoteManager (笔记 CRUD)
│   ├── 搜索 + 领域筛选
│   ├── 新建笔记弹窗
│   ├── 文件上传 (.txt/.md/.json/.csv)
│   └── 详情面板
├── GraphView (知识图谱 D3.js)
│   ├── 力导向图 (缩放/拖拽/领域高亮)
│   ├── 节点详情面板
│   └── 颜色图例
├── OutlinePanel (大纲)
│   ├── 大纲列表
│   └── 树形展开/折叠
└── FavoritesPanel (视频收藏)
    ├── B站/抖音切换
    └── 使用引导 (4 步)
```

## 技术选型理由

| 技术 | 选择理由 |
|------|----------|
| **Vite 5** | 极快冷启动，原生 ESM，体积小 |
| **TailwindCSS 3** | 原子化 CSS，零运行时，高度可定制 |
| **D3.js 7** | 力导向图最成熟方案，无依赖 |
| **Express 4** | 社区最广，中间件生态，轻量 |
| **ws** | 纯 WebSocket，无 Socket.IO 额外开销 |
| **better-sqlite3** | 同步 API，零配置，WAL 模式高性能 |
| **tsx** | TypeScript 直接运行，无需 tsc 编译 |
