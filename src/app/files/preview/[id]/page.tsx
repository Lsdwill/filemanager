'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Download, File, Image, Film, Music, FileText, AlertCircle, ChevronLeft, ChevronRight, Pencil, Share2, X, Copy, Check, Link, Lock, Save, Eye, Edit3 } from 'lucide-react';

interface DockItem {
  id: string;
  filename: string;
  type: string;
  thumbnail_url: string;
  is_current: boolean;
}

interface PreviewData {
  preview_url: string;
  filename: string;
  size: number;
  type: string;
  oss_key: string;
  folder: string;
  prev_id: string | null;
  next_id: string | null;
  dock_items: DockItem[];
  dock_current_index: number;
}

interface ShareResult {
  shareCode: string;
  shareLink: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileCategory(type: string) {
  const t = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(t)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(t)) return 'audio';
  if (t === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t)) return 'office';
  if (['md', 'markdown'].includes(t)) return 'markdown';
  if (t === 'txt') return 'text';
  return 'other';
}

export default function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { token, isAuthenticated } = useAuth();
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [backFolder, setBackFolder] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [shareOpen, setShareOpen] = useState(false);
  const [shareExpires, setShareExpires] = useState('1d');
  const [sharePasswordProtected, setSharePasswordProtected] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [shareCreating, setShareCreating] = useState(false);
  const [dockHoverIndex, setDockHoverIndex] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorLoading, setEditorLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getDockScale = useCallback((index: number): number => {
    if (dockHoverIndex === null) return 1;
    const distance = Math.abs(index - dockHoverIndex);
    if (distance === 0) return 1.6;
    if (distance === 1) return 1.3;
    if (distance === 2) return 1.1;
    return 1;
  }, [dockHoverIndex]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setBackFolder(urlParams.get('folder') || '');
  }, []);

  useEffect(() => {
    if (isAuthenticated || token) {
      params.then(p => {
        fetchPreview(p.id);
      });
    }
  }, [isAuthenticated, token]);

  async function fetchPreview(id: string) {
    setLoading(true);
    setError('');
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/files/preview/${id}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setData(d);
        // Auto-fetch content for markdown/text files
        const category = getFileCategory(d.type);
        if (category === 'markdown' || category === 'text') {
          fetchContent(id);
        }
      } else {
        setError('文件不存在');
      }
    } catch {
      setError('获取预览失败');
    }
    setLoading(false);
  }

  async function fetchContent(id: string) {
    setEditorLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/files/content/${id}`, { headers });
      if (res.ok) {
        const d = await res.json();
        setEditorContent(d.content);
      } else {
        const d = await res.json();
        alert(d.error || '获取内容失败');
      }
    } catch {
      alert('获取内容失败');
    }
    setEditorLoading(false);
  }

  async function saveContent(id: string) {
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/files/content/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: editorContent }),
      });
      if (res.ok) {
        setEditing(false);
        // Show simple success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-xl shadow-lg z-50 animate-fade-in';
        toast.textContent = '保存成功';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      } else {
        const d = await res.json();
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-50';
        toast.textContent = d.error || '保存失败';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      }
    } catch {
      const toast = document.createElement('div');
      toast.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg z-50';
      toast.textContent = '保存失败';
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
    setSaving(false);
  }

  function goPrev() {
    if (data?.prev_id) {
      const folderParam = backFolder ? `&folder=${encodeURIComponent(backFolder)}` : '';
      window.location.href = `/files/preview/${data.prev_id}?${folderParam}`;
    }
  }

  function goNext() {
    if (data?.next_id) {
      const folderParam = backFolder ? `&folder=${encodeURIComponent(backFolder)}` : '';
      window.location.href = `/files/preview/${data.next_id}?${folderParam}`;
    }
  }

  function handleDownload() {
    if (data) {
      const downloadUrl = `/api/files/download/${encodeURIComponent(data.oss_key)}`;
      window.open(downloadUrl, '_blank');
    }
  }

  async function handleRename() {
    if (!data || !renameValue.trim()) return;
    const urlId = window.location.pathname.split('/').pop();
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/files/rename', {
        method: 'POST',
        headers,
        body: JSON.stringify({ fileId: urlId, newName: renameValue.trim() }),
      });
      if (res.ok) {
        setRenaming(false);
        fetchPreview(urlId!);
      } else {
        const d = await res.json();
        alert(d.error || '重命名失败');
      }
    } catch {
      alert('重命名失败');
    }
  }

  function handleShare() {
    setShareOpen(true);
    setShareLink('');
    setShareCopied(false);
  }

  async function createShare() {
    if (!data) return;
    setShareCreating(true);
    const expiresMap: Record<string, number> = { '1h': 1, '6h': 6, '1d': 24, '7d': 168, '30d': 720 };
    try {
      const urlId = window.location.pathname.split('/').pop();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          file_id: urlId,
          expires_hours: expiresMap[shareExpires] || 24,
          is_password_protected: sharePasswordProtected,
          password: sharePasswordProtected ? sharePassword : null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        setShareLink(`${window.location.origin}/share/${d.shareCode}`);
      } else {
        alert(d.error || '分享失败');
      }
    } catch {
      alert('分享失败');
    }
    setShareCreating(false);
  }

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareLink);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  // Keyboard shortcuts for navigation - must be before any early returns
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (renaming || editing) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [data, renaming, editing]);

  // Keyboard shortcuts for closing and fullscreen - must be before any early returns
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if (renaming || editing) return;
      // ESC or X to close
      if (e.key === 'Escape' || e.key === 'x' || e.key === 'X') {
        window.location.href = `/files${backFolder ? `?folder=${encodeURIComponent(backFolder)}` : ''}`;
      }
      // Space for fullscreen (images only)
      if (e.key === ' ' && data && getFileCategory(data.type) === 'image') {
        e.preventDefault();
        const img = document.querySelector('.preview-image');
        if (img) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            img.requestFullscreen();
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [renaming, editing, backFolder, data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">预览失败</h2>
          <p className="text-white/50">{error}</p>
          <button onClick={() => window.location.href = `/files${backFolder ? `?folder=${encodeURIComponent(backFolder)}` : ''}`} className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white transition-all">
            返回文件列表
          </button>
        </div>
      </div>
    );
  }

  const category = getFileCategory(data.type);
  const hasPrev = data.prev_id !== null;
  const hasNext = data.next_id !== null;
  const fileId = window.location.pathname.split('/').pop() || '';
  const isEditable = category === 'markdown' || category === 'text';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
        <button onClick={() => window.location.href = `/files${backFolder ? `?folder=${encodeURIComponent(backFolder)}` : ''}`} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="bg-white/10 border border-yellow-400/50 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:border-yellow-400 transition-all"
                autoFocus
              />
              <button onClick={handleRename} className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-white text-sm font-medium transition-all">确认</button>
              <button onClick={() => setRenaming(false)} className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/60 text-sm transition-all">取消</button>
            </div>
          ) : (
            <>
              <p className="text-white font-medium truncate">{data.filename}</p>
              <p className="text-white/40 text-xs">{formatSize(data.size)}</p>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditable && !editing && (
            <button onClick={() => { setEditing(true); fetchContent(fileId); }} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-green-400 transition-all" title="编辑内容">
              <Edit3 className="w-4 h-4" />
            </button>
          )}
          {isEditable && editing && (
            <button onClick={() => saveContent(fileId)} disabled={saving} className="flex items-center gap-1 px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-green-500/50 rounded-lg text-white text-sm font-medium transition-all" title="保存">
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '保存'}
            </button>
          )}
          {isEditable && editing && (
            <button onClick={() => setEditing(false)} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-red-400 transition-all" title="取消编辑">
              <X className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setRenaming(true); setRenameValue(data.filename); }} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-yellow-400 transition-all" title="重命名文件">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={handleShare} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-blue-400 transition-all" title="分享">
            <Share2 className="w-4 h-4" />
          </button>
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all">
            <Download className="w-4 h-4" />
            下载
          </button>
        </div>
      </header>

      {/* Preview content with prev/next */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 relative">
        {/* Prev button */}
        {hasPrev && !editing && (
          <button onClick={goPrev} className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all z-10 backdrop-blur-sm border border-white/10" title="上一张">
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Next button */}
        {hasNext && !editing && (
          <button onClick={goNext} className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-all z-10 backdrop-blur-sm border border-white/10" title="下一张">
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        {category === 'image' && (
          <div className="max-w-4xl w-full">
            <img
              src={data.preview_url}
              alt={data.filename}
              className="preview-image max-w-full max-h-[80vh] mx-auto rounded-xl shadow-2xl object-contain"
            />
          </div>
        )}

        {category === 'video' && (
          <div className="max-w-4xl w-full">
            <video
              src={data.preview_url}
              controls
              className="max-w-full max-h-[80vh] mx-auto rounded-xl shadow-2xl"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        )}

        {category === 'audio' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
            <Music className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-4">{data.filename}</p>
            <audio
              src={data.preview_url}
              controls
              className="w-full"
            >
              您的浏览器不支持音频播放
            </audio>
          </div>
        )}

        {category === 'pdf' && (
          <div className="max-w-4xl w-full h-[80vh]">
            <iframe
              src={data.preview_url}
              className="w-full h-full rounded-xl border border-white/10"
              title={data.filename}
            />
          </div>
        )}

        {category === 'office' && (
          <div className="w-full h-[80vh] p-0">
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.preview_url)}`}
              className="w-full h-full border-0"
              title={data.filename}
              style={{ margin: 0, padding: 0 }}
            />
          </div>
        )}

        {/* Markdown editor: split view */}
        {category === 'markdown' && editing && (
          <div className="w-full h-[80vh] flex gap-4">
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-t-xl text-white/50 text-xs flex items-center gap-2">
                <Pencil className="w-3 h-3" /> 源码编辑
              </div>
              {editorLoading ? (
                <div className="flex-1 flex items-center justify-center bg-white/5 border border-white/10 rounded-b-xl">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-b-xl p-4 text-white text-sm font-mono resize-none focus:outline-none focus:border-blue-400/50 transition-all"
                  placeholder="输入 Markdown 内容..."
                  spellCheck={false}
                />
              )}
            </div>
            <div className="flex-1 flex flex-col">
              <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-t-xl text-white/50 text-xs flex items-center gap-2">
                <Eye className="w-3 h-3" /> 实时预览
              </div>
              <div className="flex-1 bg-white/5 border border-white/10 rounded-b-xl p-4 overflow-y-auto prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editorContent}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        )}

        {/* Markdown preview (non-editing) */}
        {category === 'markdown' && !editing && (
          <div className="max-w-4xl w-full h-[80vh] flex flex-col">
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-t-xl text-white/50 text-xs flex items-center gap-2">
              <Eye className="w-3 h-3" /> Markdown 预览
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-b-xl p-6 overflow-y-auto prose prose-invert max-w-none">
              {editorLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {editorContent}
                </ReactMarkdown>
              )}
            </div>
          </div>
        )}

        {/* TXT editor */}
        {category === 'text' && editing && (
          <div className="w-full h-[80vh] flex flex-col">
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-t-xl text-white/50 text-xs flex items-center gap-2">
              <Pencil className="w-3 h-3" /> 文本编辑
            </div>
            {editorLoading ? (
              <div className="flex-1 flex items-center justify-center bg-white/5 border border-white/10 rounded-b-xl">
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <textarea
                value={editorContent}
                onChange={(e) => setEditorContent(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-b-xl p-4 text-white text-sm font-mono resize-none focus:outline-none focus:border-blue-400/50 transition-all"
                placeholder="输入文本内容..."
                spellCheck={false}
              />
            )}
          </div>
        )}

        {/* TXT preview (non-editing) */}
        {category === 'text' && !editing && (
          <div className="max-w-4xl w-full h-[80vh] flex flex-col">
            <div className="px-3 py-2 bg-white/5 border border-white/10 rounded-t-xl text-white/50 text-xs flex items-center gap-2">
              <FileText className="w-3 h-3" /> 文本预览
            </div>
            <div className="flex-1 bg-white/5 border border-white/10 rounded-b-xl p-6 overflow-y-auto text-white text-sm font-mono whitespace-pre-wrap">
              {editorLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                editorContent
              )}
            </div>
          </div>
        )}

        {category === 'other' && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
            <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">{data.filename}</p>
            <p className="text-white/50 mb-6">{formatSize(data.size)} · 该文件类型不支持在线预览</p>
            <button onClick={handleDownload} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all flex items-center gap-2 mx-auto">
              <Download className="w-4 h-4" /> 下载文件
            </button>
          </div>
        )}
      </div>

      {/* Dock bar - thumbnail strip */}
      {data.dock_items && data.dock_items.length > 1 && !editing && (
        <div
          ref={dockRef}
          className="dock-bar bg-white/5 backdrop-blur-xl border-t border-white/10"
          onMouseLeave={() => setDockHoverIndex(null)}
        >
          {data.dock_items.map((item, index) => {
            const scale = getDockScale(index);
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(item.type?.toLowerCase());
            return (
              <div
                key={item.id}
                className={`dock-item ${item.is_current ? 'current-item' : ''}`}
                style={{ transform: `scale(${scale})`, transformOrigin: 'bottom center' }}
                onMouseEnter={() => setDockHoverIndex(index)}
                onClick={() => {
                  if (!item.is_current) {
                    const folderParam = backFolder ? `&folder=${encodeURIComponent(backFolder)}` : '';
                    window.location.href = `/files/preview/${item.id}?${folderParam}`;
                  }
                }}
              >
                {isImage && item.thumbnail_url ? (
                  <img
                    src={item.thumbnail_url}
                    alt={item.filename}
                    className={`w-12 h-12 ${item.is_current ? 'ring-2 ring-blue-400' : 'opacity-70 hover:opacity-100'}`}
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-12 h-12 bg-white/10 rounded-lg flex flex-col items-center justify-center ${item.is_current ? 'ring-2 ring-blue-400' : 'opacity-70'}`}>
                    <File className="w-4 h-4 text-white/40" />
                    <span className="text-white/50 text-xs truncate max-w-[48px] mt-1">{item.filename.split('.')[0]}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Share dialog */}
      {shareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShareOpen(false)} />
          <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
            <button onClick={() => setShareOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-1">分享文件</h2>
            <p className="text-white/50 text-sm mb-6">{data.filename}</p>
            {!shareLink ? (
              <>
                <div className="mb-4">
                  <label className="text-white/70 text-sm mb-2 block">过期时间</label>
                  <div className="flex gap-2">
                    {[{ label: '1 小时', value: '1h' }, { label: '6 小时', value: '6h' }, { label: '1 天', value: '1d' }, { label: '7 天', value: '7d' }, { label: '30 天', value: '30d' }].map(opt => (
                      <button key={opt.value} onClick={() => setShareExpires(opt.value)} className={`px-3 py-2 rounded-lg text-sm transition-all ${shareExpires === opt.value ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div className={`w-10 h-6 rounded-full transition-all ${sharePasswordProtected ? 'bg-blue-500' : 'bg-white/20'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${sharePasswordProtected ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                    <span className="text-white/70 text-sm">密码保护</span>
                    {sharePasswordProtected && <Lock className="w-4 h-4 text-blue-400" />}
                  </label>
                  {sharePasswordProtected && (
                    <input type="text" value={sharePassword} onChange={(e) => setSharePassword(e.target.value)} placeholder="设置访问密码" className="mt-3 w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all" />
                  )}
                </div>
                <button onClick={createShare} disabled={shareCreating || (sharePasswordProtected && !sharePassword)} className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2">
                  <Link className="w-4 h-4" />
                  {shareCreating ? '创建中...' : '创建分享链接'}
                </button>
              </>
            ) : (
              <>
                <div className="bg-white/10 rounded-xl p-4 mb-4">
                  <p className="text-white/70 text-sm mb-2">分享链接</p>
                  <p className="text-blue-400 text-sm break-all">{shareLink}</p>
                  {sharePasswordProtected && <p className="text-white/50 text-xs mt-2">访问密码: {sharePassword}</p>}
                </div>
                <button onClick={copyShareLink} className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2">
                  {shareCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {shareCopied ? '已复制' : '复制链接'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}