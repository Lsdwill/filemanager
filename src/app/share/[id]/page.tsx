'use client';

import { useState, useEffect } from 'react';
import { Download, Lock, File, Clock, Eye, AlertCircle } from 'lucide-react';

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
  };
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function ShareAccessPage({ params }: { params: Promise<{ id: string }> }) {
  const [shareCode, setShareCode] = useState<string>('');
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [needPassword, setNeedPassword] = useState(false);

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
      } else {
        setError('分享不存在或已过期');
      }
    } catch {
      setError('获取分享信息失败');
    }
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
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