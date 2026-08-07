import React, { useState } from 'react';
import { OutlineItem } from '../types';

interface OutlinePanelProps {
  outlines: any[];
  onGenerate: () => void;
  onRefresh: () => void;
}

export default function OutlinePanel({ outlines, onGenerate, onRefresh }: OutlinePanelProps) {
  const [selectedOutline, setSelectedOutline] = useState<any>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const displayOutline = selectedOutline
    ? (typeof selectedOutline.outline_data === 'string'
        ? JSON.parse(selectedOutline.outline_data)
        : selectedOutline.outline_data)
    : null;

  return (
    <div className="flex h-full">
      {/* 左侧大纲列表 */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">知识大纲</h2>
            <span className="text-xs text-gray-400">{outlines.length} 个</span>
          </div>
          <button onClick={onGenerate} className="btn-primary w-full text-sm !py-2">
            📋 生成新大纲
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {outlines.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              <span className="text-3xl block mb-2">📋</span>
              <p className="text-sm">暂无大纲</p>
              <p className="text-xs mt-1">点击上方按钮生成</p>
            </div>
          ) : (
            outlines.map((outline: any) => (
              <button
                key={outline.id}
                onClick={() => {
                  setSelectedOutline(outline);
                  // 默认展开第一层
                  if (typeof outline.outline_data === 'string') {
                    const data = JSON.parse(outline.outline_data);
                    const firstLevelIds = new Set(data.map((d: OutlineItem) => d.id));
                    setExpandedNodes(firstLevelIds);
                  }
                }}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedOutline?.id === outline.id ? 'bg-primary-50 border-l-2 border-l-primary-400' : ''
                }`}
              >
                <div className="font-medium text-sm text-gray-800 truncate">{outline.title}</div>
                <div className="text-xs text-gray-400 mt-1">{formatDate(outline.created_at)}</div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 右侧大纲详情 */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {displayOutline ? (
          <div className="p-6 max-w-3xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800">{selectedOutline?.title}</h2>
              <p className="text-xs text-gray-400 mt-1">
                创建于 {formatDate(selectedOutline?.created_at)}
                {selectedOutline?.source_note_ids && (
                  <span> · 关联 {JSON.parse(selectedOutline.source_note_ids).length} 篇笔记</span>
                )}
              </p>
            </div>

            <div className="space-y-1">
              {displayOutline.map((item: OutlineItem, idx: number) => (
                <OutlineNode
                  key={item.id}
                  item={item}
                  index={idx}
                  depth={0}
                  expandedNodes={expandedNodes}
                  onToggle={toggleNode}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <span className="text-5xl block mb-3">📋</span>
              <p className="text-lg">选择一个大纲查看</p>
              <p className="text-sm mt-1">或点击"生成新大纲"创建</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 大纲节点组件
function OutlineNode({
  item, index, depth, expandedNodes, onToggle
}: {
  item: OutlineItem;
  index: number;
  depth: number;
  expandedNodes: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedNodes.has(item.id);
  const isLevel1 = depth === 0;

  const colors = [
    'border-l-primary-500 bg-primary-50',
    'border-l-accent-500 bg-accent-50',
    'border-l-green-500 bg-green-50',
    'border-l-purple-500 bg-purple-50',
  ];

  return (
    <div>
      <div
        className={`flex items-start gap-2 p-3 rounded-r-lg border-l-4 cursor-pointer transition-colors ${
          depth === 0 ? 'mb-3 shadow-sm' : 'mb-1'
        } ${
          isLevel1 ? colors[index % colors.length] : 'border-l-transparent hover:bg-gray-100'
        }`}
        style={{ marginLeft: `${depth * 20}px` }}
        onClick={() => hasChildren && onToggle(item.id)}
      >
        {/* 展开/折叠图标 */}
        <div className="shrink-0 w-5 flex justify-center mt-0.5">
          {hasChildren ? (
            <svg
              className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          ) : (
            <span className="text-gray-300">·</span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className={`font-medium ${isLevel1 ? 'text-base' : 'text-sm'} text-gray-800`}>
            {item.title}
          </div>
          {item.content && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.content}</p>
          )}
          {item.sourceIds && item.sourceIds.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-400">📝 {item.sourceIds.length} 篇笔记</span>
            </div>
          )}
        </div>

        {isLevel1 && (
          <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
            L{depth + 1}
          </span>
        )}
      </div>

      {/* 子节点 */}
      {hasChildren && isExpanded && (
        <div className="animate-slide-up">
          {item.children.map((child, childIdx) => (
            <OutlineNode
              key={child.id}
              item={child}
              index={childIdx}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
