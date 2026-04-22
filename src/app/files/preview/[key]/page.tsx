'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, Share2, X, Cloud } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

interface PreviewData {
  preview_url: string;
  filename: string;
  size: number;
  type: string;
  oss_key: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function isImage(type: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(type.toLowerCase());
}

function isVideo(type: string) {
  return ['mp4', 'webm', 'mov'].includes(type.toLowerCase());
}

function isPdf(type: string) {
  return type.toLowerCase() === 'pdf';
}

function isOffice(type: string) {
  return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(type.toLowerCase());
}

function isAudio(type: string) {
  return ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(type.toLowerCase());
}

export default function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const { token } = useAuth();
  const [ossKey, setOssKey] = useState('');
  const [data, setData] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(p => {
      setOssKey(p.key);
      fetchPreview(p.key);
    });
  }, []);

  async function fetchPreview(key: string) {
    try {
      const res = await fetch(`/api/files/preview/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setError('无法获取预览信息');
      }
    } catch {
      setError('加载失败');
    }
    setLoading(false);
  }

  async function handleDownload() {
    if (!data) return;
    const encodedKey = encodeURIComponent(data.oss_key);
    const res = await fetch(`/api/files/download/${encodedKey}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const d = await res.json();
      window.location.href = d.download_url;
    }
  }

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
          <p className="text-red-400">{error || '无法预览此文件'}</p>
          <button onClick={() => window.location.href = '/files'} className="mt-4 px-4 py-2 bg-blue-500 rounded-xl text-white">
            返回文件列表
          </button>
        </div>
      </div>
    );
  }

  const t = data.type.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
        <button onClick={() => window.location.href = '/files'} className="text-white/60 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Cloud className="w-6 h-6 text-blue-400" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{data.filename}</p>
          <p className="text-white/40 text-xs">{formatSize(data.size)}</p>
        </div>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all">
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">下载</span>
        </button>
      </header>

      {/* Preview content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        {isImage(t) && (
          <div className="max-w-4xl w-full">
            <img
              src={data.preview_url}
              alt={data.filename}
              className="max-h-[80vh] w-auto mx-auto rounded-xl shadow-2xl"
            />
          </div>
        )}

        {isVideo(t) && (
          <div className="max-w-4xl w-full">
            <video
              src={data.preview_url}
              controls
              className="w-full max-h-[80vh] rounded-xl shadow-2xl"
            >
              您的浏览器不支持视频播放
            </video>
          </div>
        )}

        {isPdf(t) && (
          <div className="w-full max-w-4xl h-[80vh]">
            <iframe
              src={data.preview_url}
              className="w-full h-full rounded-xl border border-white/10"
              title={data.filename}
            />
          </div>
        )}

        {isOffice(t) && (
          <div className="w-full max-w-4xl h-[80vh]">
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.preview_url)}`}
              className="w-full h-full rounded-xl border border-white/10"
              title={data.filename}
            />
          </div>
        )}

        {isAudio(t) && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
            <div className="w-16 h-16 bg-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-yellow-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <p className="text-white font-medium mb-4">{data.filename}</p>
            <audio src={data.preview_url} controls className="w-full" />
          </div>
        )}

        {!isImage(t) && !isVideo(t) && !isPdf(t) && !isOffice(t) && !isAudio(t) && (
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full text-center">
            <p className="text-white/50 mb-4">此文件类型不支持在线预览</p>
            <button onClick={handleDownload} className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all flex items-center gap-2 mx-auto">
              <Download className="w-4 h-4" /> 下载文件
            </button>
          </div>
        )}
      </div>
    </div>
  );
}