'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Download, File, Image, Film, Music, FileText, AlertCircle } from 'lucide-react';

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

function getFileCategory(type: string) {
  const t = type.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(t)) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(t)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(t)) return 'audio';
  if (t === 'pdf') return 'pdf';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(t)) return 'office';
  return 'other';
}

export default function PreviewPage({ params }: { params: Promise<{ key: string }> }) {
  const [ossKey, setOssKey] = useState('');
  const [data, setData] = useState<PreviewData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then(p => {
      setOssKey(p.key);
      fetchPreview(p.key);
    });
  }, []);

  async function fetchPreview(key: string) {
    try {
      const res = await fetch(`/api/files/preview/${key}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setError('文件不存在');
      }
    } catch {
      setError('获取预览失败');
    }
    setLoading(false);
  }

  function handleDownload() {
    if (data) {
      // Generate a download link with attachment disposition
      const downloadUrl = `/api/files/download/${encodeURIComponent(data.oss_key)}`;
      window.open(downloadUrl, '_blank');
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
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">预览失败</h2>
          <p className="text-white/50">{error}</p>
          <button onClick={() => window.location.href = '/files'} className="mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white transition-all">
            返回文件列表
          </button>
        </div>
      </div>
    );
  }

  const category = getFileCategory(data.type);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
        <button onClick={() => window.location.href = '/files'} className="p-2 rounded-lg text-white/60 hover:bg-white/10 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">{data.filename}</p>
          <p className="text-white/40 text-xs">{formatSize(data.size)}</p>
        </div>
        <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all">
          <Download className="w-4 h-4" />
          下载
        </button>
      </header>

      {/* Preview content */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        {category === 'image' && (
          <div className="max-w-4xl w-full">
            <img
              src={data.preview_url}
              alt={data.filename}
              className="max-w-full max-h-[80vh] mx-auto rounded-xl shadow-2xl object-contain"
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
          <div className="max-w-4xl w-full h-[80vh]">
            <iframe
              src={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(data.preview_url)}`}
              className="w-full h-full rounded-xl border border-white/10"
              title={data.filename}
            />
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
    </div>
  );
}