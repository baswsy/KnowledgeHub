import React, { useState, useEffect } from 'react';
import { VideoFavorite } from '../../../../server/types.js';

interface FavoritesPanelProps {
  favorites: VideoFavorite[];
  favoritesPlatform: string;
  onFetchFavorites: (platform: string, uid: string, favName: string) => void;
  favoritesLoading?: boolean;
  favoritesMessage?: string;
}

const BILIBILI_HELP_STEPS = [
  {
    title: '将视频收藏到公开收藏夹',
    description: '在B站创建或使用现有的公开收藏夹，将需要提炼总结的视频收藏进去。',
    tip: '在收藏夹设置中将隐私设为"公开"，否则系统无法访问。',
  },
  {
    title: '获取你的B站UID',
    description: '在B站网页版点击头像 → 个人中心，URL中的数字就是你的UID。',
    tip: '例如：https://space.bilibili.com/12345678 中的 12345678',
  },
  {
    title: '输入收藏夹名称',
    description: '输入你需要分析的那个公开收藏夹的名称（不需要完全一致，系统会模糊匹配）。',
    tip: '例如："学习资料"、"技术视频"、"前端教程"等。',
  },
];

export default function FavoritesPanel({
  favorites,
  onFetchFavorites,
  favoritesLoading = false,
  favoritesMessage = '',
}: FavoritesPanelProps) {
  const [uid, setUid] = useState('');
  const [favName, setFavName] = useState('');
  const [fetchStatus, setFetchStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [expandedHelp, setExpandedHelp] = useState<number | null>(null);

  useEffect(() => {
    if (favoritesMessage) {
      setStatusMessage(favoritesMessage);
      if (favoritesMessage.includes('成功')) {
        setFetchStatus('success');
      } else if (favoritesMessage.includes('失败') || favoritesMessage.includes('错误')) {
        setFetchStatus('error');
      }
    }
  }, [favoritesMessage]);

  useEffect(() => {
    if (favoritesLoading) {
      setFetchStatus('loading');
      setStatusMessage('正在获取收藏夹数据...');
    }
  }, [favoritesLoading]);

  const handleFetch = async () => {
    if (!uid.trim()) {
      setFetchStatus('error');
      setStatusMessage('请输入B站UID');
      return;
    }
    if (!favName.trim()) {
      setFetchStatus('error');
      setStatusMessage('请输入收藏夹名称');
      return;
    }

    setFetchStatus('loading');
    setStatusMessage('正在获取B站收藏夹数据...');
    onFetchFavorites('bilibili', uid.trim(), favName.trim());
  };

  const handleClearAll = async () => {
    try {
      const { clearFavorites } = await import('../utils/api');
      await clearFavorites('bilibili');
      setFetchStatus('idle');
      setStatusMessage('');
    } catch (err: any) {
      setStatusMessage('清空失败: ' + err.message);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 头部 */}
      <div className="p-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.223 3.086a1.25 1.25 0 010 1.768L17.08 5.996h1.17A3.75 3.75 0 0122 9.747v7.5a3.75 3.75 0 01-3.75 3.75H5.75A3.75 3.75 0 012 17.247v-7.5a3.75 3.75 0 013.75-3.75h1.166L5.777 4.855a1.25 1.25 0 111.768-1.768l2.012 2.012a3.73 3.73 0 014.886 0l2.012-2.012a1.25 1.25 0 011.768 0z"/>
            <path d="M8.25 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM13.5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM18.75 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
          </svg>
          B站收藏导入
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          通过公开收藏夹导入B站视频，让AI帮你分析整理
        </p>
      </div>

      {/* 使用步骤 */}
      <div className="p-4 bg-blue-50 border-b border-blue-100">
        <h3 className="text-sm font-medium text-blue-800 mb-3 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          使用步骤
        </h3>
        <div className="space-y-2">
          {BILIBILI_HELP_STEPS.map((step, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-blue-100 overflow-hidden cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => setExpandedHelp(expandedHelp === index ? null : index)}
            >
              <div className="flex items-center gap-2 px-3 py-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="text-sm font-medium text-gray-700">{step.title}</span>
                <svg className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${expandedHelp === index ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
              {expandedHelp === index && (
                <div className="px-3 pb-3 pt-0">
                  <p className="text-sm text-gray-600">{step.description}</p>
                  {step.tip && (
                    <p className="text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-1 rounded">
                      <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"/>
                      </svg>
                      {step.tip}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 输入区域 */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            B站 UID
          </label>
          <input
            type="text"
            value={uid}
            onChange={(e) => setUid(e.target.value)}
            placeholder="例如: 12345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
            disabled={favoritesLoading}
          />
          <p className="text-xs text-gray-400 mt-1">B站个人空间URL中的数字ID</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            收藏夹名称
          </label>
          <input
            type="text"
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            placeholder="例如: 学习资料"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
            disabled={favoritesLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleFetch();
            }}
          />
          <p className="text-xs text-gray-400 mt-1">输入要分析的收藏夹名称，支持模糊匹配</p>
        </div>

        <button
          onClick={handleFetch}
          disabled={favoritesLoading || !uid.trim() || !favName.trim()}
          className="w-full py-2.5 bg-pink-500 text-white rounded-lg text-sm font-medium hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {favoritesLoading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              获取中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
              获取收藏
            </>
          )}
        </button>

        {/* 状态消息 */}
        {statusMessage && (
          <div className={`p-2.5 rounded-lg text-sm ${
            fetchStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
            fetchStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>

      {/* 已导入收藏列表 */}
      {favorites.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">
                已导入视频 ({favorites.length})
              </h3>
              <button
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                清空全部
              </button>
            </div>
            <div className="space-y-2">
              {favorites.map((fav) => (
                <div
                  key={fav.id}
                  className="flex gap-3 p-2.5 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => {
                    if (fav.url) window.open(fav.url, '_blank');
                  }}
                >
                  {fav.cover_url && (
                    <img
                      src={fav.cover_url}
                      alt={fav.title}
                      className="w-16 h-10 rounded object-cover flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-800 truncate" title={fav.title}>
                      {fav.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {fav.author}
                      {fav.duration && ` · ${fav.duration}`}
                    </p>
                    {fav.tags && fav.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {fav.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 空状态 */}
      {favorites.length === 0 && fetchStatus !== 'loading' && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13l-3 3m0 0l-3-3m3 3V8m0 13a9 9 0 110-18 9 9 0 010 18z"/>
            </svg>
            <p className="text-sm text-gray-400">输入B站UID和收藏夹名称</p>
            <p className="text-sm text-gray-400">点击"获取收藏"开始导入</p>
          </div>
        </div>
      )}
    </div>
  );
}
