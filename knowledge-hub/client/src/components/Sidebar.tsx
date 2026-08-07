import React from 'react';
import { ViewTab } from '../types';

interface SidebarProps {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  notesCount: number;
  wsConnected: boolean;
  showMobile: boolean;
  onCloseMobile: () => void;
}

const navItems: { id: ViewTab; label: string; icon: string; desc: string }[] = [
  { id: 'chat', label: 'AI 对话', icon: '💬', desc: '与 Agent 对话' },
  { id: 'notes', label: '笔记管理', icon: '📝', desc: '上传与管理笔记' },
  { id: 'graph', label: '知识图谱', icon: '🕸️', desc: '可视化知识关联' },
  { id: 'outline', label: '知识大纲', icon: '📋', desc: '结构化知识整理' },
  { id: 'favorites', label: '视频收藏', icon: '🎬', desc: 'B站收藏夹导入' },
];

export default function Sidebar({ activeTab, onTabChange, notesCount, wsConnected, showMobile, onCloseMobile }: SidebarProps) {
  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-gray-200 flex-col shrink-0">
        <SidebarContent
          activeTab={activeTab}
          onTabChange={onTabChange}
          notesCount={notesCount}
          wsConnected={wsConnected}
        />
      </aside>

      {/* 移动端侧边栏 */}
      {showMobile && (
        <aside className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white border-r border-gray-200 z-50 shadow-xl animate-slide-up">
          <SidebarContent
            activeTab={activeTab}
            onTabChange={onTabChange}
            notesCount={notesCount}
            wsConnected={wsConnected}
            mobile
          />
        </aside>
      )}
    </>
  );
}

function SidebarContent({
  activeTab, onTabChange, notesCount, wsConnected, mobile
}: {
  activeTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  notesCount: number;
  wsConnected: boolean;
  mobile?: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo 区域 */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="font-bold text-lg text-gray-800">KnowledgeHub</h2>
            <p className="text-xs text-gray-400">智能知识管理平台</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
          <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span>{wsConnected ? 'Agent 在线' : 'Agent 离线'}</span>
          <span className="mx-1">|</span>
          <span>📝 {notesCount} 篇笔记</span>
        </div>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
              activeTab === item.id
                ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
            }`}
          >
            <span className="text-lg w-7 text-center">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-gray-400 truncate">{item.desc}</div>
            </div>
            {activeTab === item.id && (
              <div className="w-1 h-6 bg-primary-500 rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* 底部信息 */}
      <div className="p-4 border-t border-gray-100">
        <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-3">
          <p className="text-xs text-primary-700 font-medium mb-1">💡 提示</p>
          <p className="text-xs text-primary-600">
            上传笔记后，让 Agent 帮你梳理知识、构建图谱、生成大纲
          </p>
        </div>
      </div>
    </div>
  );
}
