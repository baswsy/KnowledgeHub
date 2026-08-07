import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isProcessing: boolean;
  onSend: (message: string, action?: string, options?: any) => void;
  onResearch: (topic: string, noteIds?: string[]) => void;
  onGenerateGraph: () => void;
  onGenerateOutline: () => void;
  onFetchFavorites: (platform: string) => void;
}

const quickActions = [
  { label: '📊 生成知识图谱', action: 'generate_graph', color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100' },
  { label: '📋 生成知识大纲', action: 'generate_outline', color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' },
  { label: '🔬 深度研究', action: 'research', color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { label: '📺 分析B站收藏', action: 'bilibili_fav', color: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100' },

];

export default function ChatPanel({
  messages, isProcessing, onSend, onResearch, onGenerateGraph, onGenerateOutline, onFetchFavorites
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [researchMode, setResearchMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    if (researchMode) {
      onResearch(trimmed);
    } else {
      onSend(trimmed);
    }
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'generate_graph':
        onGenerateGraph();
        break;
      case 'generate_outline':
        onGenerateOutline();
        break;
      case 'research':
        setResearchMode(!researchMode);
        inputRef.current?.focus();
        break;
      case 'bilibili_fav':
        onFetchFavorites('bilibili');
        break;

    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 快捷操作栏 */}
      {messages.length === 0 && (
        <div className="p-6 animate-fade-in">
          <div className="text-center mb-8">
            <span className="text-5xl mb-4 block">🧠</span>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">欢迎来到 KnowledgeHub</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              这里是你的专属知识助手，上传笔记、提问研究、构建知识图谱，让知识管理更智能
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
            {quickActions.map(act => (
              <button
                key={act.action}
                onClick={() => handleQuickAction(act.action)}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 ${act.color}`}
              >
                {act.label}
              </button>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
            <FeatureCard
              icon="📝"
              title="上传笔记"
              desc="支持文本粘贴、文件上传，Agent 自动分析归类"
            />
            <FeatureCard
              icon="🎬"
              title="视频收藏"
              desc="设置B站公开收藏夹 → 输入UID和收藏夹名称 → Agent分析归类"
            />
            <FeatureCard
              icon="🕸️"
              title="知识图谱"
              desc="自动构建个人知识网络，发现关联"
            />
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-lg mb-2">开始与 Agent 对话</p>
            <p className="text-sm">输入问题或使用上方的快捷操作</p>
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isProcessing && (
          <div className="flex items-start gap-3 animate-fade-in">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
              <span className="text-sm">🧠</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="p-4 bg-white border-t border-gray-100">
        {/* 研究模式指示 */}
        {researchMode && (
          <div className="mb-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center gap-2 animate-slide-up">
            <span>🔬</span>
            <span>深度研究模式已开启 — Agent 将进行更深入的分析</span>
            <button
              onClick={() => setResearchMode(false)}
              className="ml-auto text-amber-400 hover:text-amber-600"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              researchMode
                ? '输入研究主题，Agent 将结合笔记进行深度分析...'
                : '向 Agent 提问，或粘贴笔记内容... (Shift+Enter 换行)'
            }
            rows={1}
            className="flex-1 resize-none input-field min-h-[44px] max-h-32 py-2.5"
            disabled={isProcessing}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="btn-primary px-5 py-3 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1.5 text-center">
          KnowledgeHub Agent 可以访问你的笔记来回答问题 · 也可使用 @研究 进行深度分析
        </p>
      </div>
    </div>
  );
}

// 消息气泡组件
function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isGraph = message.type === 'graph';
  const isOutline = message.type === 'outline';

  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{message.content}</span>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* 头像 */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
        isUser ? 'bg-accent-100' : 'bg-primary-100'
      }`}>
        <span className="text-sm">{isUser ? '👤' : '🧠'}</span>
      </div>

      {/* 内容 */}
      <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 shadow-sm ${
        isUser
          ? 'bg-primary-600 text-white rounded-tr-sm'
          : 'bg-white border border-gray-100 rounded-tl-sm'
      }`}>
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className={`text-sm ${isGraph || isOutline ? '' : 'markdown-body'}`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* 时间戳 */}
        <div className={`text-xs mt-1 ${isUser ? 'text-primary-200' : 'text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// 功能卡片
function FeatureCard({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="card p-4 text-center">
      <span className="text-2xl">{icon}</span>
      <h3 className="font-medium text-sm text-gray-800 mt-2">{title}</h3>
      <p className="text-xs text-gray-400 mt-1">{desc}</p>
    </div>
  );
}
