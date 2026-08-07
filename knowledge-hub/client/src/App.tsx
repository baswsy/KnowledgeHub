import React, { useState, useEffect, useCallback } from 'react';
import { ViewTab, Note, ChatMessage, KnowledgeGraph as KG, OutlineItem } from './types';
import { VideoFavorite } from '../../server/types.js';
import { wsClient, api } from './utils/api';
import Sidebar from './components/Sidebar';
import ChatPanel from './components/ChatPanel';
import NoteManager from './components/NoteManager';
import GraphView from './components/GraphView';
import OutlinePanel from './components/OutlinePanel';
import FavoritesPanel from './components/FavoritesPanel';

export default function App() {
  const [activeTab, setActiveTab] = useState<ViewTab>('chat');
  const [notes, setNotes] = useState<Note[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [graphData, setGraphData] = useState<KG>({ nodes: [], edges: [] });
  const [outlines, setOutlines] = useState<any[]>([]);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 收藏夹状态
  const [favorites, setFavorites] = useState<VideoFavorite[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesMessage, setFavoritesMessage] = useState('');

  // 初始化
  useEffect(() => {
    loadNotes();
    loadGraph();
    loadOutlines();

    // 连接 WebSocket
    wsClient.connect();

    const unsubMsg = wsClient.on('message', (msg: ChatMessage) => {
      setMessages(prev => [...prev, msg]);
      setIsProcessing(false);
    });

    const unsubGraph = wsClient.on('graph_update', (data: KG) => {
      setGraphData(data);
    });

    const unsubConnected = wsClient.on('connected', () => {
      setWsConnected(true);
      setError(null);
    });

    const unsubDisconnected = wsClient.on('disconnected', () => {
      setWsConnected(false);
    });

    return () => {
      unsubMsg();
      unsubGraph();
      unsubConnected();
      unsubDisconnected();
      wsClient.disconnect();
    };
  }, []);

  const loadNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data);
    } catch (err) {
      console.error('加载笔记失败:', err);
    }
  };

  const loadGraph = async () => {
    try {
      const data = await api.getGraph();
      if (data.nodes?.length > 0) {
        setGraphData(data);
      }
    } catch (err) {
      console.error('加载知识图谱失败:', err);
    }
  };

  const loadOutlines = async () => {
    try {
      const data = await api.getOutlines();
      setOutlines(data);
    } catch (err) {
      console.error('加载大纲失败:', err);
    }
  };

  // 发送消息到 Agent
  const sendMessage = useCallback((content: string, action: string = 'chat', extraOptions?: any) => {
    if (!wsClient.connected) {
      setError('WebSocket 未连接，请等待重连或刷新页面');
      return;
    }
    setError(null);

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    wsClient.send({
      action,
      content,
      ...(extraOptions || {}),
    });
  }, []);

  // 创建笔记后刷新
  const handleNoteCreated = useCallback((note: Note) => {
    setNotes(prev => [note, ...prev]);
  }, []);

  // 删除笔记
  const handleNoteDeleted = useCallback(async (id: string) => {
    await api.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  }, []);

  // 从笔记生成图谱
  const handleGenerateGraph = useCallback(() => {
    sendMessage('请基于我的所有笔记生成知识图谱', 'generate_graph');
    setActiveTab('graph');
  }, [sendMessage]);

  // 从笔记生成大纲
  const handleGenerateOutline = useCallback(() => {
    sendMessage('请基于我的所有笔记生成知识大纲', 'generate_outline');
    setActiveTab('outline');
  }, [sendMessage]);

  // 深度研究
  const handleResearch = useCallback((topic: string, noteIds?: string[]) => {
    sendMessage(topic, 'research', { noteIds });
  }, [sendMessage]);

  /**
   * 触发收藏夹 AI 分析
   * ChatPanel 的快捷按钮「分析B站收藏」触发
   */
  const handleFetchFavorites = useCallback((platform: string) => {
    const displayPlatform = platform === 'bilibili' ? 'B站' : '抖音';
    sendMessage(`请分析我已导入的${displayPlatform}收藏夹视频，按主题分类并提供学习建议`, 'fetch_favorites', { platform });
    setActiveTab('chat');
  }, [sendMessage]);

  /**
   * 从 B站公开API 获取收藏夹数据
   * FavoritesPanel 调用，传入 UID 和收藏夹名称
   */
  const handleImportFavorites = useCallback(async (platform: string, uid: string, favName: string) => {
    setFavoritesLoading(true);
    setFavoritesMessage('正在从B站获取收藏夹数据...');
    try {
      const result = await api.fetchBilibiliFavorites(uid, favName);
      setFavorites(result.favorites || []);
      setFavoritesMessage(`成功导入 ${result.count} 个视频！现在可以点击"分析B站收藏"让AI帮你分析整理。`);
      setFavoritesLoading(false);
    } catch (err: any) {
      setFavoritesMessage('获取失败: ' + (err.message || '未知错误'));
      setFavoritesLoading(false);
    }
  }, []);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* 移动端遮罩 */}
      {showMobileSidebar && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* 侧边栏 */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => { setActiveTab(tab); setShowMobileSidebar(false); }}
        notesCount={notes.length}
        wsConnected={wsConnected}
        showMobile={showMobileSidebar}
        onCloseMobile={() => setShowMobileSidebar(false)}
      />

      {/* 移动端顶部栏 */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-30 flex items-center px-4">
        <button
          onClick={() => setShowMobileSidebar(true)}
          className="p-2 hover:bg-gray-100 rounded-lg mr-3"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">🧠</span>
          <h1 className="font-bold text-gray-800">KnowledgeHub</h1>
        </div>
        <div className="flex-1" />
        <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col lg:pt-0 pt-14 overflow-hidden">
        {/* 桌面端顶部栏 */}
        <header className="hidden lg:flex items-center h-14 px-6 bg-white border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧠</span>
            <h1 className="font-bold text-gray-800">KnowledgeHub</h1>
            <span className="text-xs text-gray-400 ml-2 bg-gray-100 px-2 py-0.5 rounded-full">智能知识管理</span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-400 animate-pulse-soft' : 'bg-red-400'}`} />
            <span className={`text-xs ${wsConnected ? 'text-green-600' : 'text-red-500'}`}>
              {wsConnected ? 'Agent 已连接' : 'Agent 未连接'}
            </span>
          </div>
        </header>

        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2 animate-slide-up">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">✕</button>
          </div>
        )}

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <ChatPanel
              messages={messages}
              isProcessing={isProcessing}
              onSend={(msg) => sendMessage(msg)}
              onResearch={handleResearch}
              onGenerateGraph={handleGenerateGraph}
              onGenerateOutline={handleGenerateOutline}
              onFetchFavorites={handleFetchFavorites}
            />
          )}

          {activeTab === 'notes' && (
            <NoteManager
              notes={notes}
              onNoteCreated={handleNoteCreated}
              onNoteDeleted={handleNoteDeleted}
              onRefresh={loadNotes}
            />
          )}

          {activeTab === 'graph' && (
            <GraphView
              graphData={graphData}
              onRefresh={loadGraph}
              onGenerate={handleGenerateGraph}
            />
          )}

          {activeTab === 'outline' && (
            <OutlinePanel
              outlines={outlines}
              onGenerate={handleGenerateOutline}
              onRefresh={loadOutlines}
            />
          )}

          {activeTab === 'favorites' && (
            <FavoritesPanel
              favorites={favorites}
              favoritesPlatform="bilibili"
              onFetchFavorites={handleImportFavorites}
              favoritesLoading={favoritesLoading}
              favoritesMessage={favoritesMessage}
            />
          )}
        </div>
      </main>
    </div>
  );
}
