import { query } from '@tencent-ai/agent-sdk';
import { AgentRequest, KnowledgeGraph, OutlineItem, VideoFavorite } from './types';
import {
  getNotes, getNoteById, searchNotes,
  saveKnowledgeGraph, getKnowledgeGraph,
  saveOutline, saveVideoFavorite,
  getVideoFavorites,
} from './database';

/**
 * Agent 系统提示词 - 构建类 NotebookLM 的知识管理助手
 */
const SYSTEM_PROMPT = `你是一个知识管理助手，功能类似 NotebookLM，帮助用户：
1. 整理和分析笔记、研究资料
2. 梳理不同领域的知识点，建立知识关联
3. 生成结构化的知识大纲
4. 构建用户专有知识图谱

你可以访问用户已存储的笔记和知识内容来处理请求。
请用中文回复，回答要专业、有条理、深入浅出。`;

/**
 * 生成研究 Agent 的系统提示词
 */
function buildResearchPrompt(message: string, notes: string): string {
  return `${SYSTEM_PROMPT}

用户当前存储的笔记内容如下：
${notes}

用户的研究问题：${message}

请基于用户的笔记和你的知识，进行深入的研究分析，提供结构化的回答。`;
}

/**
 * 生成知识图谱的提示词
 */
function buildGraphPrompt(allNotes: string): string {
  return `你是一个知识图谱构建专家。请分析以下用户的笔记内容，提取关键概念和知识点，并生成一个知识图谱。

笔记内容：
${allNotes}

请以 JSON 格式返回知识图谱数据，格式如下：
{
  "nodes": [
    { "id": "唯一ID", "label": "概念名称", "group": "领域分类", "type": "concept|note|source", "weight": 1-10的重要度 }
  ],
  "edges": [
    { "id": "关系ID", "source": "源节点ID", "target": "目标节点ID", "label": "关系描述", "strength": 1-10的关系强度 }
  ]
}

要求：
- 提取 10-30 个核心概念节点
- 建立概念之间的关系边
- 权重和强度按重要性赋值
- group 分类要合理，如"技术"、"科学"、"人文"、"艺术"等
- 关系 label 要具体，如"依赖于"、"属于"、"相关"、"应用"等

只输出 JSON，不要输出其他内容。`;
}

/**
 * 生成大纲的提示词
 */
function buildOutlinePrompt(allNotes: string): string {
  return `你是一个知识结构梳理专家。请分析以下用户的笔记内容，生成一个层级化的大纲结构。

笔记内容：
${allNotes}

请以 JSON 格式返回大纲数据，格式如下：
[
  {
    "id": "唯一ID",
    "title": "标题",
    "level": 1,
    "content": "该节点的内容摘要",
    "children": [...子节点，结构相同...],
    "sourceIds": ["关联的笔记ID列表"]
  }
]

要求：
- 构建 2-3 层的层级大纲
- 顶层按领域或主题分类
- 每层要有具体的知识点描述
- 关联到实际的笔记内容

只输出 JSON，不要输出其他内容。`;
}

/**
 * B站收藏夹分析提示词 — 基于已导入的收藏数据进行分析
 */
function buildFavoritesPrompt(favoritesSummary: string): string {
  return `用户已从B站公开收藏夹导入了视频数据，以下是所有视频列表：

${favoritesSummary}

请分析这些视频收藏，完成以下任务：
1. **主题分类**：将所有视频按知识领域分类（如编程技术、商业经济、人文历史、科学科普、设计艺术等）
2. **知识要点提取**：根据视频标题和简介，推断每个视频可能包含的核心知识点
3. **学习路径建议**：根据不同主题推荐观看顺序和学习路径
4. **补充标签**：为每个视频补充3-5个精准的中文知识标签（2-5个字）
5. **汇总摘要**：给出这批收藏的整体概览，含各主题分布统计

注意：
- 由于无法直接访问视频内容，请基于标题、作者和简介信息进行合理推断
- 标签使用简体中文，简洁精准
- 如果某些视频信息不足，根据标题做出你的最佳判断`;
}

/**
 * Agent 核心处理函数 - 使用 CodeBuddy SDK
 */
export async function processAgentRequest(req: AgentRequest): Promise<string> {
  const { type, message, noteIds } = req;
  const allNotes = getNotes();

  switch (type) {
    case 'chat':
      return handleChat(message, allNotes);

    case 'research':
      return handleResearch(message, allNotes, noteIds);

    case 'analyze_notes':
      return handleAnalyzeNotes(message, allNotes);

    case 'generate_graph':
      return handleGenerateGraph(allNotes);

    case 'generate_outline':
      return handleGenerateOutline(allNotes);

    case 'fetch_favorites':
      return handleFetchFavorites(req.platform || 'bilibili');

    default:
      return handleChat(message, allNotes);
  }
}

/**
 * 普通对话处理
 */
async function handleChat(message: string, notes: any[]): Promise<string> {
  const notesContext = notes.length > 0
    ? notes.map(n => `## ${n.title}\n领域: ${n.domain}\n${n.content.slice(0, 2000)}`).join('\n\n---\n\n')
    : '（暂无存储的笔记）';

  const fullPrompt = buildResearchPrompt(message, notesContext);

  try {
    const response = await query({
      prompt: fullPrompt,
      options: {
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
      },
    });

    return extractResponseText(response);
  } catch (error) {
    console.error('Agent query error:', error);
    return '抱歉，Agent 处理请求时出错，请稍后重试。';
  }
}

/**
 * 深度研究处理
 */
async function handleResearch(message: string, notes: any[], noteIds?: string[]): Promise<string> {
  let targetNotes = notes;
  if (noteIds && noteIds.length > 0) {
    targetNotes = noteIds.map(id => getNoteById(id)).filter(Boolean) as any[];
  }

  const notesContext = targetNotes.map(n => `## ${n.title}\n领域: ${n.domain}\n${n.content}`).join('\n\n---\n\n');

  const fullPrompt = `${SYSTEM_PROMPT}

用户需要进行深度研究。以下是相关资料：

${notesContext}

研究任务：${message}

请进行深入分析，提供：
1. 关键发现和洞察
2. 不同资料之间的关联和矛盾
3. 延伸研究和建议
4. 结构化总结`;

  try {
    const response = await query({
      prompt: fullPrompt,
      options: {
        maxTurns: 5,
        permissionMode: 'bypassPermissions',
      },
    });

    return extractResponseText(response);
  } catch (error) {
    console.error('Research error:', error);
    return '研究过程中出现错误，请稍后重试。';
  }
}

/**
 * 笔记分析处理
 */
async function handleAnalyzeNotes(message: string, notes: any[]): Promise<string> {
  const notesContext = notes.map(n =>
    `ID: ${n.id}\n标题: ${n.title}\n领域: ${n.domain}\n标签: ${n.tags.join(', ')}\n内容摘要: ${n.content.slice(0, 500)}`
  ).join('\n\n');

  const fullPrompt = `你是一个知识管理专家。请分析以下用户的笔记集合：

${notesContext}

用户的分析需求：${message}

请提供专业的分析报告，包括：
1. 知识结构概览
2. 各领域覆盖情况
3. 知识盲区和建议补充的方向
4. 笔记之间的潜在关联`;

  try {
    const response = await query({
      prompt: fullPrompt,
      options: {
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
      },
    });

    return extractResponseText(response);
  } catch (error) {
    console.error('Analyze error:', error);
    return '笔记分析过程出错，请稍后重试。';
  }
}

/**
 * 生成知识图谱
 */
async function handleGenerateGraph(notes: any[]): Promise<string> {
  const allNotes = notes.map(n =>
    `[ID: ${n.id}] 标题: ${n.title}\n领域: ${n.domain}\n标签: ${n.tags.join(', ')}\n内容: ${n.content}`
  ).join('\n\n---\n\n');

  const fullPrompt = buildGraphPrompt(allNotes);

  try {
    const response = await query({
      prompt: fullPrompt,
      options: {
        maxTurns: 2,
        permissionMode: 'bypassPermissions',
      },
    });

    const text = extractResponseText(response);
    // 尝试解析 JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const graphData: KnowledgeGraph = JSON.parse(jsonMatch[0]);
        saveKnowledgeGraph('default', graphData);
        return JSON.stringify({ type: 'graph', data: graphData, message: '知识图谱已生成并保存！' });
      } catch {
        // 如果 JSON 解析失败，返回原文
      }
    }

    return text;
  } catch (error) {
    console.error('Graph generation error:', error);
    return '知识图谱生成失败，请稍后重试。';
  }
}

/**
 * 生成大纲
 */
async function handleGenerateOutline(notes: any[]): Promise<string> {
  const allNotes = notes.map(n =>
    `[ID: ${n.id}] 标题: ${n.title}\n领域: ${n.domain}\n内容: ${n.content}`
  ).join('\n\n---\n\n');

  const fullPrompt = buildOutlinePrompt(allNotes);

  try {
    const response = await query({
      prompt: fullPrompt,
      options: {
        maxTurns: 2,
        permissionMode: 'bypassPermissions',
      },
    });

    const text = extractResponseText(response);
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const outlineData: OutlineItem[] = JSON.parse(jsonMatch[0]);
        saveOutline('知识大纲', outlineData, notes.map(n => n.id));
        return JSON.stringify({ type: 'outline', data: outlineData, message: '知识大纲已生成！' });
      } catch {
        // fallback
      }
    }

    return text;
  } catch (error) {
    console.error('Outline generation error:', error);
    return '大纲生成失败，请稍后重试。';
  }
}

/**
 * 处理 B站 收藏夹分析 — 基于已通过公开API导入的数据
 * 
 * 数据流：用户提供UID+收藏夹名称 → 服务端通过B站公开API获取 → 存入数据库
 * → 此函数读取 DB 中的数据 → Agent 分析
 */
async function handleFetchFavorites(platform: string): Promise<string> {
  // 从数据库读取已导入的收藏数据
  const favorites = getVideoFavorites(platform);

  if (!favorites || favorites.length === 0) {
    return `你还没有导入B站收藏夹数据。

请在左侧「B站收藏导入」面板：
1. 将你需要分析总结的视频收藏到B站的一个**公开收藏夹**中
2. 输入你的 B站 UID 和收藏夹名称
3. 点击"获取收藏"导入视频数据
4. 导入完成后返回此处，我将为你分析这些视频

💡 提示：收藏夹需要设置为"公开"才能被读取。`;
  }

  // 构建视频列表摘要
  const list = favorites.map((f: any, i: number) => {
    const tags = typeof f.tags === 'string' ? JSON.parse(f.tags || '[]') : (f.tags || []);
    return [
      `[${i + 1}] ${f.title}`,
      `    作者: ${f.author || '未知'}`,
      `    时长: ${f.duration || '未知'}`,
      `    简介: ${(f.description || '').slice(0, 150)}`,
      `    标签: ${Array.isArray(tags) ? tags.join(', ') : '' || '无'}`,
    ].join('\n');
  }).join('\n\n');

  const prompt = buildFavoritesPrompt(list);

  try {
    const response = await query({
      prompt,
      options: {
        maxTurns: 3,
        permissionMode: 'bypassPermissions',
      },
    });

    return extractResponseText(response);
  } catch (error) {
    console.error('Favorites analyze error:', error);
    return '分析收藏夹内容时出错，请稍后重试。';
  }
}

/**
 * 从 SDK 响应中提取文本内容
 */
function extractResponseText(response: any): string {
  if (typeof response === 'string') return response;

  // SDK 返回的消息格式
  if (response?.result) return response.result;
  if (response?.text) return response.text;
  if (response?.content) {
    if (Array.isArray(response.content)) {
      return response.content
        .filter((block: any) => block.type === 'text')
        .map((block: any) => block.text)
        .join('\n');
    }
    return response.content;
  }

  // 如果 response 是消息数组
  if (Array.isArray(response)) {
    return response
      .filter((msg: any) => msg.role === 'assistant' || msg.type === 'assistant')
      .map((msg: any) => msg.content || msg.text || '')
      .join('\n');
  }

  return JSON.stringify(response);
}

/**
 * 将 Agent 返回内容解析为结构化结果
 */
export function parseStructuredResult(text: string): {
  type: 'text' | 'graph' | 'outline';
  message: string;
  data?: any;
} {
  try {
    const parsed = JSON.parse(text);
    if (parsed.type === 'graph' || parsed.type === 'outline') {
      return parsed;
    }
  } catch {
    // not JSON
  }
  return { type: 'text', message: text };
}
