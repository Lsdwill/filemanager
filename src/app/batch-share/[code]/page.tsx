'use client';

import { useState, useEffect } from 'react';
import { Download, Lock, File, Clock, Eye, AlertCircle, Image, Film, Music, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FileInfo {
  id: string;
  filename: string;
  size: number;
  type: string;
  oss_key: string;
}

interface ShareData {
  share: {
    id: string;
    share_code: string;
    is_password_protected: boolean;
    expires_at: string;
    view_count: number;
  };
  files: FileInfo[];
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

function getFileIcon(type: string) {
  const t = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t)) return <Image className="w-5 h-5 text-pink-400" />;
  if (['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'webm'].includes(t)) return <Film className="w-5 h-5 text-purple-400" />;
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(t)) return <Music className="w-5 h-5 text-yellow-400" />;
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t)) return <FileText className="w-5 h-5 text-blue-400" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

export default function BatchSharePage({ params }: { params: Promise<{ code: string }> }) {
  const [shareCode, setShareCode] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    params.then(p => {
      setShareCode(p.code);
      fetchShareInfo(p.code);
    });
  }, []);

  useEffect(() => {
    if (shareData && shareData.files.length > 0 && !needPassword) {
      fetchPreview(shareData.files[selectedFileIndex]);
    }
  }, [shareData, selectedFileIndex, needPassword]);

  async function fetchShareInfo(code: string) {
    try {
      const res = await fetch(`/api/batch-share/${code}`);
      if (res.ok) {
        const data = await res.json();
        setShareData(data);
        if (data.share.is_password_protected) {
          setNeedPassword(true);
        }
      } else {
        setError('分享不存在或已过期');
      }
    } catch {
      setError('获取分享信息失败');
    }
    setLoading(false);
  }

  async function fetchPreview(file: FileInfo) {
    setPreviewLoading(true);
    setPreviewUrl(null);
    setPreviewContent('');

    const category = getFileCategory(file.type);

    try {
      // Get preview URL
      const res = await fetch('/api/share/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_code: shareCode,
          password: needPassword ? password : null,
          file_id: file.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(data.preview_url);

        // For markdown/text, fetch content
        if (category === 'markdown' || category === 'text') {
          const contentRes = await fetch('/api/share/content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              share_code: shareCode,
              password: needPassword ? password : null,
              file_id: file.id,
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

  async function handleDownload(file: FileInfo) {
    setDownloading(true);
    try {
      const res = await fetch('/api/share/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_code: shareCode,
          password: needPassword ? password : null,
          file_id: file.id,
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

  function goPrev() {
    if (selectedFileIndex > 0) {
      setSelectedFileIndex(selectedFileIndex - 1);
    }
  }

  function goNext() {
    if (shareData && selectedFileIndex < shareData.files.length - 1) {
      setSelectedFileIndex(selectedFileIndex + 1);
    }
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

  const currentFile = shareData?.files[selectedFileIndex];
  const category = currentFile ? getFileCategory(currentFile.type) : 'other';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white">批量分享</h1>
            <p className="text-white/50 text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              有效期至 {new Date(shareData?.share.expires_at || '').toLocaleString('zh-CN')}
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <Eye className="w-4 h-4" /> {shareData?.share.view_count || 0} 次访问
          </div>
        </div>
      </header>

      {/* Password input */}
      {needPassword && (
        <div className="p-4 bg-white/5 border-b border-white/10">
          <div className="max-w-md mx-auto">
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
            <button
              onClick={() => { setNeedPassword(false); if (shareData?.files[0]) fetchPreview(shareData.files[0]); }}
              disabled={!password}
              className="mt-3 w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-2 font-medium transition-all"
            >
              确认密码
            </button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex">
        {/* File list sidebar */}
        <aside className="w-64 bg-white/5 border-r border-white/10 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-white/70 text-sm mb-3">文件列表 ({shareData?.files.length || 0})</h2>
            <div className="space-y-2">
              {shareData?.files.map((file, index) => (
                <button
                  key={file.id}
                  onClick={() => setSelectedFileIndex(index)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    index === selectedFileIndex
                      ? 'bg-blue-500/20 border border-blue-400/50'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent'
                  }`}
                >
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.filename}</p>
                    <p className="text-white/40 text-xs">{formatSize(file.size)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Preview area */}
        <main className="flex-1 flex flex-col">
          {currentFile && !needPassword && (
            <>
              {/* File info bar */}
              <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(currentFile.type)}
                  <div>
                    <p className="text-white font-medium">{currentFile.filename}</p>
                    <p className="text-white/40 text-xs">{formatSize(currentFile.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {shareData?.files.length > 1 && (
                    <>
                      <button
                        onClick={goPrev}
                        disabled={selectedFileIndex === 0}
                        className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <span className="text-white/50 text-sm">{selectedFileIndex + 1} / {shareData?.files.length}</span>
                      <button
                        onClick={goNext}
                        disabled={selectedFileIndex === shareData?.files.length - 1}
                        className="p-2 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30 transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDownload(currentFile)}
                    disabled={downloading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 rounded-xl text-white font-medium transition-all"
                  >
                    <Download className="w-4 h-4" />
                    {downloading ? '下载中...' : '下载'}
                  </button>
                </div>
              </div>

              {/* Preview content */}
              <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                {previewLoading ? (
                  <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                ) : previewUrl ? (
                  <>
                    {category === 'image' && (
                      <img src={previewUrl} alt={currentFile.filename} className="max-w-full max-h-full rounded-xl object-contain" />
                    )}
                    {category === 'video' && (
                      <video src={previewUrl} controls className="max-w-full max-h-full rounded-xl" />
                    )}
                    {category === 'audio' && (
                      <div className="text-center">
                        <Music className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                        <p className="text-white mb-4">{currentFile.filename}</p>
                        <audio src={previewUrl} controls className="w-full max-w-md" />
                      </div>
                    )}
                    {category === 'pdf' && (
                      <iframe src={previewUrl} className="w-full h-full rounded-xl border border-white/10" title={currentFile.filename} />
                    )}
                    {category === 'office' && (
                      <iframe src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(previewUrl)}`} className="w-full h-full rounded-xl border-0" title={currentFile.filename} />
                    )}
                    {category === 'markdown' && previewContent && (
                      <div className="w-full max-w-4xl bg-white/5 rounded-xl p-6 prose prose-invert prose-sm max-w-none overflow-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{previewContent}</ReactMarkdown>
                      </div>
                    )}
                    {category === 'text' && previewContent && (
                      <div className="w-full max-w-4xl bg-white/5 rounded-xl p-6 text-white text-sm font-mono whitespace-pre-wrap overflow-auto">
                        {previewContent}
                      </div>
                    )}
                    {category === 'other' && (
                      <div className="text-center">
                        <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-white mb-2">{currentFile.filename}</p>
                        <p className="text-white/50 mb-4">该文件类型不支持在线预览</p>
                        <button
                          onClick={() => handleDownload(currentFile)}
                          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all"
                        >
                          下载文件
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-white/50">加载预览...</div>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {error && <p className="text-red-400 text-sm p-4 text-center">{error}</p>}
    </div>
  );
}