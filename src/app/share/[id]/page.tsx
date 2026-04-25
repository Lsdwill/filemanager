'use client';

import { useState, useEffect } from 'react';
import { Download, Lock, File, Clock, Eye, AlertCircle, Image, Film, Music, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ShareData {
  share: {
    id: string;
    share_code: string;
    is_password_protected: number;
    expires_at: string;
    view_count: number;
  };
  file: {
    filename: string;
    size: number;
    type: string;
    oss_key: string;
  };
  preview_url?: string;
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

export default function ShareAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const [shareCode, setShareCode] = useState<string>('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    params.then(p => {
      setShareCode(p.id);
      fetchShareInfo(p.id);
    });
  }, []);

  async function fetchShareInfo(code: string) {
    try {
      const res = await fetch(`/api/share/${code}`);
      if (res.ok) {
        const data = await res.json();
        setShareData(data);
        if (data.share.is_password_protected) {
          setNeedPassword(true);
        }
        // Fetch preview URL for previewable files
        const category = getFileCategory(data.file.type);
        if (['image', 'video', 'audio', 'pdf', 'office', 'markdown', 'text'].includes(category)) {
          fetchPreviewUrl(code, data);
        }
      } else {
        setError('分享不存在或已过期');
      }
    } catch {
      setError('获取分享信息失败');
    }
    setLoading(false);
  }

  async function fetchPreviewUrl(code: string, data: ShareData) {
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/share/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_code: code,
          password: needPassword ? password : null,
        }),
      });
      if (res.ok) {
        const previewData = await res.json();
        setShareData(prev => prev ? { ...prev, preview_url: previewData.preview_url } : prev);
        // For markdown/text, fetch content
        const category = getFileCategory(data.file.type);
        if (category === 'markdown' || category === 'text') {
          const contentRes = await fetch('/api/share/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              share_code: code,
              password: needPassword ? password : null,
            }),
          });
          if (contentRes.ok) {
            const contentData = await contentRes.json();
            setPreviewContent(contentData.content);
          }
        }
      }
    } catch {}
    setPreviewLoading(false);
  }

  async function handleDownload() {
    setError('');
    setDownloading(true);
    try {
      const res = await fetch('/api/share/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_code: shareCode,
          password: needPassword ? password : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '下载失败');
        setDownloading(false);
        return;
      }

      const data = await res.json();
      window.location.href = data.download_url;
    } catch {
      setError('下载失败');
    }
    setDownloading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !shareData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">分享不存在</h2>
          <p className="text-white/50">{error}</p>
        </div>
      </div>
    );
  }

  const category = shareData ? getFileCategory(shareData.file.type) : 'other';
  const canPreview = ['image', 'video', 'audio', 'pdf', 'office', 'markdown', 'text'].includes(category);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-4xl w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
            <File className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">{shareData?.file.filename}</h2>
        <p className="text-white/50 text-center mb-6">{formatSize(shareData?.file.size || 0)}</p>

        <div className="flex items-center justify-center gap-4 mb-6 text-sm text-white/50">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            有效期至 {new Date(shareData?.share.expires_at || '').toLocaleString('zh-CN')}
          </span>
          <span className="flex items-center gap-1">
            <Eye className="w-4 h-4" /> {shareData?.share.view_count || 0} 次访问
          </span>
        </div>

        {needPassword && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-blue-400" />
              <span className="text-white/70 text-sm">此分享需要密码访问</span>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="输入访问密码"
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
            />
          </div>
        )}

        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}

        {/* Preview area */}
        {canPreview && shareData?.preview_url && !needPassword && (
          <div className="mb-6">
            {category === 'image' && (
              <img src={shareData.preview_url} alt={shareData.file.filename} className="max-w-full max-h-[50vh] mx-auto rounded-xl" />
            )}
            {category === 'video' && (
              <video src={shareData.preview_url} controls className="max-w-full max-h-[50vh] mx-auto rounded-xl" />
            )}
            {category === 'audio' && (
              <div className="text-center">
                <Music className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <audio src={shareData.preview_url} controls className="w-full" />
              </div>
            )}
            {category === 'pdf' && (
              <iframe src={shareData.preview_url} className="w-full h-[50vh] rounded-xl border border-white/10" title={shareData.file.filename} />
            )}
            {category === 'office' && (
              <iframe src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(shareData.preview_url)}`} className="w-full h-[50vh] rounded-xl border-0" title={shareData.file.filename} />
            )}
            {category === 'markdown' && previewContent && (
              <div className="bg-white/5 rounded-xl p-4 prose prose-invert prose-sm max-w-none max-h-[50vh] overflow-y-auto">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
              </div>
            )}
            {category === 'text' && previewContent && (
              <div className="bg-white/5 rounded-xl p-4 text-white text-sm font-mono whitespace-pre-wrap max-h-[50vh] overflow-y-auto">
                {previewContent}
              </div>
            )}
          </div>
        )}

        {previewLoading && (
          <div className="mb-6 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <button
          onClick={handleDownload}
          disabled={downloading || (needPassword && !password)}
          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          {downloading ? '准备下载...' : '下载文件'}
        </button>
      </div>
    </div>
  );
}