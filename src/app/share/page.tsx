'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import {
  Share2, Trash2, Clock, Lock, Eye, Copy, Check, ArrowLeft, Cloud
} from 'lucide-react';

interface ShareInfo {
  id: string;
  share_code: string;
  is_password_protected: number;
  password: string | null;
  expires_at: string;
  created_at: string;
  view_count: number;
  filename: string;
  size: number;
  type: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
}

export default function ShareManagePage() {
  const { token } = useAuth();
  const [shares, setShares] = useState<ShareInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchShares();
  }, [token]);

  async function fetchShares() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/share/list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setShares(data.shares);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function deleteShare(id: string) {
    if (!token || !confirm('确定取消此分享？')) return;
    try {
      await fetch(`/api/share/manage/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setShares(shares.filter(s => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  async function copyLink(shareCode: string, id: string) {
    const link = `${window.location.origin}/share/${shareCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
        <button onClick={() => window.location.href = '/files'} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Cloud className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold text-white">我的分享</h1>
      </header>

      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : shares.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-white/40">
            <Share2 className="w-16 h-16 mb-4" />
            <p className="text-lg">暂无分享</p>
          </div>
        ) : (
          <div className="space-y-3">
            {shares.map(share => (
              <div key={share.id} className={`bg-white/5 rounded-xl p-4 border ${isExpired(share.expires_at) ? 'border-red-500/30' : 'border-white/10'} transition-all`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-white font-medium truncate">{share.filename}</p>
                    <p className="text-white/40 text-sm">{formatSize(share.size)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyLink(share.share_code, share.id)} className="p-2 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-500/20 transition-all" title="复制链接">
                      {copiedId === share.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteShare(share.id)} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all" title="取消分享">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className={`flex items-center gap-1 ${isExpired(share.expires_at) ? 'text-red-400' : 'text-white/50'}`}>
                    <Clock className="w-4 h-4" />
                    {isExpired(share.expires_at) ? '已过期' : formatDate(share.expires_at)}
                  </span>
                  <span className="flex items-center gap-1 text-white/50">
                    <Eye className="w-4 h-4" /> {share.view_count} 次访问
                  </span>
                  {share.is_password_protected && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Lock className="w-4 h-4" /> 密码保护
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}