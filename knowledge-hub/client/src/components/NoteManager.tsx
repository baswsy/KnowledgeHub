import React, { useState, useRef } from 'react';
import { Note } from '../types';
import { api } from '../utils/api';

interface NoteManagerProps {
  notes: Note[];
  onNoteCreated: (note: Note) => void;
  onNoteDeleted: (id: string) => void;
  onRefresh: () => void;
}

export default function NoteManager({ notes, onNoteCreated, onNoteDeleted, onRefresh }: NoteManagerProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [domain, setDomain] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
      const note = await api.createNoteText(title || '未命名笔记', content, tagList, domain);
      onNoteCreated(note);
      setShowCreate(false);
      setTitle('');
      setContent('');
      setTags('');
      setDomain('general');
    } catch (err) {
      console.error('创建笔记失败:', err);
    }
    setIsSubmitting(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSubmitting(true);
    try {
      const note = await api.uploadNote(file);
      onNoteCreated(note);
    } catch (err) {
      console.error('上传失败:', err);
    }
    setIsSubmitting(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const filteredNotes = searchQuery
    ? notes.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : notes;

  const domains = [...new Set(notes.map(n => n.domain))];

  return (
    <div className="flex h-full">
      {/* 左侧笔记列表 */}
      <div className="w-full md:w-80 lg:w-96 border-r border-gray-200 flex flex-col bg-white">
        <div className="p-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-800">我的笔记</h2>
            <span className="text-xs text-gray-400">{notes.length} 篇</span>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索笔记..."
                className="input-field pl-8 !py-1.5"
              />
            </div>
            <button onClick={() => setShowCreate(true)} className="btn-primary !px-3 !py-1.5 text-xs">
              + 新建
            </button>
          </div>
        </div>

        {/* 领域筛选 */}
        {domains.length > 0 && (
          <div className="flex gap-1 px-3 py-2 overflow-x-auto border-b border-gray-50">
            {domains.map(d => (
              <button
                key={d}
                onClick={() => setSearchQuery(d)}
                className="tag whitespace-nowrap cursor-pointer hover:bg-primary-100"
              >
                {d}
              </button>
            ))}
          </div>
        )}

        {/* 笔记列表 */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="text-4xl block mb-2">📝</span>
              <p className="text-sm">暂无笔记</p>
              <p className="text-xs mt-1">点击"新建"添加第一篇笔记</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <button
                key={note.id}
                onClick={() => setSelectedNote(note)}
                className={`w-full text-left p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
                  selectedNote?.id === note.id ? 'bg-primary-50 border-l-2 border-l-primary-400' : ''
                }`}
              >
                <div className="font-medium text-sm text-gray-800 truncate">{note.title}</div>
                <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{note.content.slice(0, 120)}</div>
                <div className="flex items-center gap-1 mt-1.5">
                  <span className="tag text-xs">{note.domain}</span>
                  {note.tags.slice(0, 2).map(t => (
                    <span key={t} className="text-xs text-gray-400">#{t}</span>
                  ))}
                  <span className="text-xs text-gray-300 ml-auto">{formatDate(note.createdAt)}</span>
                </div>
                {note.source === 'bilibili' && (
                  <span className="tag-accent text-xs mt-1">B站视频</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* 上传按钮 */}
        <div className="p-2 border-t border-gray-100">
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.json,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full btn-secondary text-xs !py-2 flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            上传文件 (.txt .md .json .csv)
          </button>
        </div>
      </div>

      {/* 右侧笔记详情 */}
      <div className="hidden md:flex flex-1 flex-col bg-gray-50">
        {selectedNote ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-gray-800">{selectedNote.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="tag">{selectedNote.domain}</span>
                    {selectedNote.tags.map(t => (
                      <span key={t} className="tag">#{t}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => {
                    onNoteDeleted(selectedNote.id);
                    setSelectedNote(null);
                  }}
                  className="text-gray-400 hover:text-red-500 p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                创建: {formatDate(selectedNote.createdAt)} · 更新: {formatDate(selectedNote.updatedAt)}
                {selectedNote.sourceUrl && (
                  <a href={selectedNote.sourceUrl} target="_blank" className="text-primary-500 ml-2">查看来源 →</a>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {selectedNote.content}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <span className="text-5xl block mb-3">📖</span>
              <p className="text-lg">选择一篇笔记查看</p>
              <p className="text-sm mt-1">或点击左侧"新建"创建笔记</p>
            </div>
          </div>
        )}
      </div>

      {/* 创建笔记弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">新建笔记</h3>
              <p className="text-xs text-gray-400 mt-1">输入笔记内容，Agent 会自动分析归类</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="输入笔记标题（可选）"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">内容</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="粘贴或输入笔记内容..."
                  rows={8}
                  className="input-field resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">领域</label>
                  <select
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="input-field"
                  >
                    <option value="general">通用</option>
                    <option value="computer-science">计算机科学</option>
                    <option value="science">自然科学</option>
                    <option value="mathematics">数学</option>
                    <option value="history">历史</option>
                    <option value="literature">文学</option>
                    <option value="philosophy">哲学</option>
                    <option value="art">艺术</option>
                    <option value="economics">经济学</option>
                    <option value="psychology">心理学</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="用逗号分隔"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-secondary">取消</button>
              <button
                onClick={handleCreate}
                disabled={!content.trim() || isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? '创建中...' : '创建笔记'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}
