# 贡献指南

感谢你对 KnowledgeHub 的关注！

## 如何贡献

### 报告 Bug

1. 使用 [GitHub Issues](https://github.com/baswsy/KnowledgeHub/issues) 提交
2. 描述复现步骤、预期行为、实际行为
3. 附上浏览器/环境信息

### 提交功能建议

1. 在 Issues 中描述功能需求
2. 说明使用场景和预期效果
3. 讨论技术可行性后开始开发

### 代码贡献流程

```bash
# 1. Fork 仓库
# 2. 克隆到本地
git clone https://github.com/你的用户名/KnowledgeHub.git
cd KnowledgeHub

# 3. 安装依赖
npm install
cd client && npm install && cd ..

# 4. 创建功能分支
git checkout -b feature/your-feature

# 5. 开始开发（确保前后端都能运行）
npm run dev

# 6. 提交代码
git add .
git commit -m "feat: 新增 xxx 功能"

# 7. 推送并创建 PR
git push origin feature/your-feature
```

### 提交规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/)：

| 前缀 | 用途 |
|------|------|
| `feat:` | 新功能 |
| `fix:` | 修复 Bug |
| `docs:` | 文档更新 |
| `style:` | 代码格式（不影响功能） |
| `refactor:` | 重构 |
| `perf:` | 性能优化 |
| `test:` | 测试相关 |
| `chore:` | 构建/工具配置 |

### 代码风格

- **TypeScript** — 严格模式，类型完整
- **React** — 函数组件 + Hooks
- **TailwindCSS** — 原子类优先，避免行内样式
- **文件命名** — PascalCase 组件，camelCase 工具函数

### 项目结构约定

- 新增组件 → `client/src/components/`
- 新增 API → `server/index.ts`（路由）+ `server/agent.ts`（处理逻辑）
- 新增数据表 → `server/database.ts`

### 开发环境要求

- Node.js >= 18
- npm >= 9
- CodeBuddy CLI（AI 功能需要）

---

**不确定从哪开始？** 查看 [Issues 中标记为 `good first issue`](https://github.com/baswsy/KnowledgeHub/issues) 的任务。
