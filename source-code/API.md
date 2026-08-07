# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3001/api`（开发）或 `https://your-server.com/api`（生产）
- **WebSocket**: `ws://localhost:3001`
- **Content-Type**: `application/json`
- **文件上传**: `multipart/form-data`

---

## REST API

### 健康检查

```
GET /api/health
```

**响应示例：**
```json
{
  "status": "ok",
  "timestamp": "2026-08-06T10:00:00.000Z"
}
```

---

### 笔记管理

#### 获取所有笔记

```
GET /api/notes
```

**响应：**
```json
[
  {
    "id": "uuid",
    "title": "深度学习入门",
    "content": "神经网络基础概念...",
    "tags": ["AI", "深度学习"],
    "domain": "计算机科学",
    "source": "upload",
    "summary": "神经网络基础概念介绍",
    "created_at": "2026-08-06T10:00:00.000Z",
    "updated_at": "2026-08-06T10:00:00.000Z"
  }
]
```

#### 搜索笔记

```
GET /api/notes/search?q=深度学习
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 搜索关键词（标题+内容+标签模糊匹配） |

#### 获取单篇笔记

```
GET /api/notes/:id
```

#### 创建文本笔记

```
POST /api/notes/text
Content-Type: application/json
```

**请求体：**
```json
{
  "title": "深度学习入门",
  "content": "神经网络基础概念...",
  "tags": ["AI", "深度学习"],
  "domain": "计算机科学"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | 否 | 标题，默认"未命名笔记" |
| `content` | string | **是** | 笔记内容 |
| `tags` | string[] | 否 | 标签数组 |
| `domain` | string | 否 | 知识领域，默认"general" |

#### 文件上传创建笔记

```
POST /api/notes
Content-Type: multipart/form-data
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `file` | File | **是** | 支持 .txt/.md/.json/.csv，最大 50MB |
| `title` | string | 否 | 默认使用文件名 |
| `domain` | string | 否 | 知识领域 |
| `tags` | string | 否 | JSON 数组或逗号分隔的标签 |
| `skipAnalysis` | string | 否 | "true" 跳过 AI 自动分析 |

> 上传后 Agent 会自动分析内容，提取领域、标签和摘要。

#### 更新笔记

```
PUT /api/notes/:id
Content-Type: application/json
```

**请求体（部分更新）：**
```json
{
  "title": "新标题",
  "content": "更新后的内容",
  "tags": ["新标签"]
}
```

#### 删除笔记

```
DELETE /api/notes/:id
```

**响应：**
```json
{ "success": true }
```

---

### 知识图谱

```
GET /api/graph
```

**响应：**
```json
{
  "nodes": [
    {
      "id": "n1",
      "label": "深度学习",
      "type": "concept",
      "domain": "计算机科学",
      "importance": 0.9
    }
  ],
  "edges": [
    {
      "source": "n1",
      "target": "n2",
      "relation": "依赖",
      "strength": 0.8
    }
  ]
}
```

| 节点字段 | 类型 | 说明 |
|----------|------|------|
| `id` | string | 唯一标识 |
| `label` | string | 显示标签 |
| `type` | string | concept / topic / resource |
| `domain` | string | 所属领域 |
| `importance` | number | 重要度 0-1 |

---

### 大纲

```
GET /api/outlines
```

**响应：**
```json
[
  {
    "id": "uuid",
    "title": "AI 学习路线",
    "outline_data": {
      "title": "AI 学习路线",
      "children": [
        {
          "title": "数学基础",
          "children": [
            { "title": "线性代数" },
            { "title": "概率论" }
          ]
        }
      ]
    },
    "source_note_ids": ["note-uuid-1", "note-uuid-2"],
    "created_at": "2026-08-06T10:00:00.000Z"
  }
]
```

---

### 视频收藏

```
GET /api/favorites
GET /api/favorites?platform=bilibili
GET /api/favorites?platform=douyin
```

**响应：**
```json
[
  {
    "id": "uuid",
    "platform": "bilibili",
    "title": "Transformer 详解",
    "url": "https://www.bilibili.com/video/BVxxx",
    "description": "深入讲解 Transformer 架构",
    "author": "AI 博主",
    "cover_url": "https://...",
    "duration": "25:30",
    "tags": ["AI", "NLP"],
    "imported_at": "2026-08-06T10:00:00.000Z"
  }
]
```

---

## WebSocket API

### 连接

```javascript
const ws = new WebSocket('ws://localhost:3001');
```

### 心跳

```
Client → Server:
  { "type": "ping" }

Server → Client:
  { "type": "pong" }
```

前端每 30 秒自动发送心跳，3 秒未响应自动重连。

---

### 请求格式

```json
{
  "action": "chat",
  "content": "什么是深度学习？",
  "noteIds": ["note-uuid-1"],
  "userId": "user-1",
  "options": {}
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `action` | string | **是** | chat / research / generate_graph / generate_outline / fetch_favorites |
| `content` | string | 是 | 用户消息 |
| `noteIds` | string[] | 否 | 关联笔记 ID 列表 |
| `platform` | string | 否 | 平台标识 (fetch_favorites 时用) |
| `options` | object | 否 | 额外选项 |

---

### 响应消息类型

#### 状态消息（处理开始）

```json
{
  "id": "msg-uuid",
  "role": "system",
  "content": "处理 chat 请求中...",
  "timestamp": "2026-08-06T10:00:00.000Z",
  "type": "status"
}
```

#### 文本回复

```json
{
  "id": "msg-uuid",
  "role": "assistant",
  "content": "深度学习是机器学习的一个分支...",
  "timestamp": "2026-08-06T10:00:01.000Z",
  "type": "text"
}
```

#### 知识图谱更新

```json
{
  "type": "graph_update",
  "data": {
    "nodes": [...],
    "edges": [...]
  }
}
```

#### 大纲更新

```json
{
  "id": "msg-uuid",
  "role": "assistant",
  "content": "已生成知识大纲",
  "timestamp": "...",
  "type": "outline",
  "data": {
    "title": "AI 学习路线",
    "children": [...]
  }
}
```

---

### 动作类型详解

#### `chat` — AI 对话

基于所有笔记上下文进行智能对话。

#### `research` — 深度研究

对指定笔记进行深度分析（maxTurns=5）。

#### `generate_graph` — 生成知识图谱

Agent 分析所有笔记，生成 10-30 个节点的知识图谱。

#### `generate_outline` — 生成大纲

Agent 分析笔记集合，生成 2-3 层结构化大纲。

#### `fetch_favorites` — 导入视频收藏

Agent 引导用户提供 B站/抖音收藏夹链接，分析视频内容并导入。

---

## 错误处理

### HTTP 错误响应

```json
{
  "error": "错误描述信息"
}
```

| 状态码 | 含义 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### WebSocket 错误响应

```json
{
  "id": "msg-uuid",
  "role": "assistant",
  "content": "处理出错: 错误原因",
  "timestamp": "...",
  "type": "text"
}
```
