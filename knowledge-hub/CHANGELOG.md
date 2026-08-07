# Changelog

## [1.0.0] - 2026-08-06

### 新增
- **AI 对话面板** — 基于 CodeBuddy Agent SDK 的智能对话，支持 Markdown 渲染
- **笔记管理** — 文本/文件上传创建笔记，AI 自动分析提取标签和摘要
- **知识图谱** — D3.js 力导向图可视化，支持拖拽、缩放、领域高亮
- **知识大纲** — Agent 自动生成 2-3 层结构化大纲，树形展开
- **视频收藏导入** — 支持 B站/抖音收藏夹分析导入
- **离线模式** — 纯静态部署时自动降级到 localStorage
- **WebSocket 实时通信** — 支持 chat/research/graph/outline/favorites 五种动作
- **SQLite 持久化** — 4 张核心表，WAL 模式
- **GitHub Pages 部署** — CI/CD 自动构建

### 技术栈
- 前端：React 18 + TypeScript + Vite 5 + TailwindCSS 3 + D3.js 7
- 后端：Express 4 + WebSocket (ws) + better-sqlite3
- AI：@tencent-ai/agent-sdk
- 部署：GitHub Actions + GitHub Pages

---

版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/) 规范。
