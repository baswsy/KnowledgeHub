<div align="center">

# 🧠 KnowledgeHub

**AI 驱动的智能知识管理平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-green.svg)](./CHANGELOG.md)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

类 NotebookLM 体验 | AI 智能分析 | 知识图谱可视化 | 离线可用

</div>

---

## ✨ 功能亮点

| 功能 | 说明 |
|------|------|
| 🤖 **AI 对话** | 基于 CodeBuddy Agent SDK，结合笔记上下文进行深度问答 |
| 📝 **笔记管理** | 文本/文件上传（.txt/.md/.json/.csv），AI 自动分析提取标签和摘要 |
| 🕸️ **知识图谱** | D3.js 力导向图可视化，拖拽缩放，领域高亮 |
| 📋 **知识大纲** | Agent 自动生成 2-3 层结构化大纲，树形展开 |
| 📺 **视频收藏** | 支持 B站公开收藏夹导入分析 |
| 📴 **离线模式** | 纯静态部署时自动降级到 localStorage，核心功能可用 |

---

## 🚀 快速开始

```bash
# 克隆仓库
git clone https://github.com/baswsy/KnowledgeHub.git
cd KnowledgeHub

# 安装依赖
npm install
cd client && npm install && cd ..

# 启动开发环境
npm run dev
```

- 前端：http://localhost:3000
- 后端：http://localhost:3001

> **注意**：AI 功能需要安装 [CodeBuddy CLI](https://www.codebuddy.ai)，运行 `codebuddy --help` 确认已安装。

---

## 📂 源代码项目结构

```
source-code/
├── client/                       # React 前端 (Vite + TailwindCSS)
│   ├── index.html                # SPA 入口 HTML
│   ├── package.json              # 前端依赖与脚本
│   ├── vite.config.ts            # Vite 构建配置 (代理 + GitHub Pages)
│   ├── tsconfig.json             # 前端 TypeScript 配置
│   ├── tailwind.config.js        # TailwindCSS 自定义主题
│   ├── postcss.config.js         # PostCSS 管线
│   ├── .env.production           # 生产环境变量模板
│   ├── dist/                     # 构建产物 (GitHub Pages 部署)
│   └── src/
│       ├── main.tsx              # React 入口
│       ├── App.tsx               # 根组件 (状态管理中心)
│       ├── types.ts              # 前端类型定义
│       ├── styles/
│       │   └── index.css         # 全局样式 + 组件类 + 动画
│       ├── hooks/                # 自定义 Hooks (待扩展)
│       ├── utils/
│       │   └── api.ts            # API 客户端 + WebSocket + 离线存储
│       └── components/           # 6 大功能面板
│           ├── ChatPanel.tsx     # AI 对话
│           ├── NoteManager.tsx   # 笔记管理
│           ├── GraphView.tsx     # 知识图谱 (D3.js)
│           ├── OutlinePanel.tsx  # 大纲面板
│           ├── FavoritesPanel.tsx # 视频收藏导入
│           └── Sidebar.tsx       # 侧边栏导航
├── server/                       # Express + WebSocket 后端
│   ├── index.ts                  # REST API + WebSocket 路由 (multer 文件上传)
│   ├── agent.ts                  # Agent SDK 调度 (6 种 AI 模式)
│   ├── database.ts               # SQLite 数据层 (4 张表, WAL 模式)
│   └── types.ts                  # 共享类型定义
├── notes/                        # 运行时数据 (gitignore)
│   ├── knowledge-hub.db          # SQLite 数据库
│   └── uploads/                  # 文件上传暂存
├── package.json                  # 根项目脚本 (dev/build/start)
├── tsconfig.json                 # 服务端 TypeScript 配置
├── .gitignore
├── README.md
├── LICENSE                       # MIT 许可证
├── ARCHITECTURE.md               # 系统架构文档
├── API.md                        # REST + WebSocket 接口文档
├── PRD.md                        # 产品需求文档
├── CHANGELOG.md                  # 版本更新日志
└── CONTRIBUTING.md               # 贡献指南
```

---

## 🛠️ 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **AI 引擎** | @tencent-ai/agent-sdk | CodeBuddy Agent SDK |
| **前端框架** | React 18 + TypeScript | 函数组件 + Hooks |
| **构建工具** | Vite 5 | 极速 HMR |
| **样式** | TailwindCSS 3 | 原子化 CSS |
| **可视化** | D3.js 7 | 力导向图 |
| **Markdown** | react-markdown | AI 回复渲染 |
| **后端** | Express 4 | REST API |
| **实时通信** | ws | 原生 WebSocket |
| **数据库** | SQLite (better-sqlite3) | 零配置持久化 |
| **部署** | GitHub Actions + Pages | CI/CD 自动化 |

---

## 📖 文档

| 文档 | 内容 |
|------|------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 系统架构、设计决策、技术选型 |
| [API.md](./API.md) | REST + WebSocket 接口文档 |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 贡献指南 |

---

## 🌐 部署

### 前端（GitHub Pages）

仓库已配置 GitHub Actions，推送代码自动构建部署：

1. 打开 **Settings → Pages**
2. Source 选择 `Deploy from a branch`
3. Branch 选择 `master`，目录选 `/docs`
4. 保存后访问 `https://你的用户名.github.io/KnowledgeHub/`

### 后端

```bash
# 设置环境变量
export ANTHROPIC_API_KEY=your-key    # CodeBuddy Agent SDK 所需

# 生产启动
cd server
npx tsx index.ts
```

---

## ⚙️ 离线模式

前端部署到 GitHub Pages（纯静态）时自动切换离线模式：

- 🔄 笔记存储：浏览器 localStorage
- 🕸️ 知识图谱：本地缓存
- 📴 AI 对话：需后端在线
- 🔄 重连后端后数据自动同步

---

## 📄 License

MIT © 2026 [KnowledgeHub](https://github.com/baswsy/KnowledgeHub)
