'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Upload, Trash2, Clock, ArrowLeft, Cloud, Link, Copy, Check, File, FolderPlus, Save } from 'lucide-react';

interface UploadShareInfo {
  id: string;
  share_code: string;
  name: string;
  expires_at: string;
  created_at: string;
}

interface UploadFileInfo {
  id: string;
  upload_share_id: string;
  oss_key: string;
  filename: string;
  size: number;
  type: string;
  created_at: string;
  saved: boolean;
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

export default function UploadShareManagePage() {
  const { token } = useAuth();
  const [shares, setShares] = useState<UploadShareInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedShare, setSelectedShare] = useState<UploadShareInfo | null>(null);
  const [uploadFiles, setUploadFiles] = useState<UploadFileInfo[]>([]);
  const [savingFileId, setSavingFileId] = useState<string | null>(null);

  useEffect(() => {
    fetchShares();
  }, [token]);

  async function fetchShares() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/upload-share', {
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

  async function fetchUploadFiles(shareId: string) {
    if (!token) return;
    try {
      const res = await fetch(`/api/upload-share/files/${shareId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUploadFiles(data.files);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function createShare(name: string, expiresHours: number) {
    if (!token) return;
    try {
      const res = await fetch('/api/upload-share', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, expires_hours: expiresHours }),
      });
      if (res.ok) {
        fetchShares();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function deleteShare(id: string) {
    if (!token || !confirm('确定删除此上传分享？所有上传的文件也将被删除。')) return;
    try {
      const res = await fetch(`/api/upload-share/manage/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setShares(shares.filter(s => s.id !== id));
        if (selectedShare?.id === id) {
          setSelectedShare(null);
          setUploadFiles([]);
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function copyLink(shareCode: string, id: string) {
    const link = `${window.location.origin}/upload/${shareCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function saveFile(file: UploadFileInfo) {
    if (!token) return;
    setSavingFileId(file.id);
    try {
      const res = await fetch('/api/upload-share/save', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_id: file.id }),
      });
      if (res.ok) {
        fetchUploadFiles(file.upload_share_id);
      } else {
        const data = await res.json();
        alert(data.error || '保存失败');
      }
    } catch (err) {
      console.error(err);
    }
    setSavingFileId(null);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <header className="sticky top-0 z-40 bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 flex items-center gap-4">
        <button onClick={() => window.location.href = '/files'} className="text-white/60 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <Upload className="w-6 h-6 text-blue-400" />
        <h1 className="text-xl font-bold text-white">上传分享管理</h1>
        <button
          onClick={() => {
            const name = prompt('分享名称', '匿名上传');
            if (name) createShare(name, 168);
          }}
          className="ml-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-all flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" /> 创建分享
        </button>
      </header>

      <div className="p-4 md:p-6 flex gap-6">
        {/* Share list */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : shares.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-white/40">
              <Upload className="w-16 h-16 mb-4" />
              <p className="text-lg">暂无上传分享</p>
              <p className="text-sm">点击上方按钮创建分享链接</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shares.map(share => (
                <div
                  key={share.id}
                  className={`bg-white/5 rounded-xl p-4 border cursor-pointer transition-all ${selectedShare?.id === share.id ? 'border-blue-400 ring-2 ring-blue-400/30' : 'border-white/10 hover:border-blue-400/30'} ${isExpired(share.expires_at) ? 'opacity-50' : ''}`}
                  onClick={() => { setSelectedShare(share); fetchUploadFiles(share.id); }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{share.name}</p>
                      <p className="text-white/40 text-sm">{share.share_code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); copyLink(share.share_code, share.id); }} className="p-2 rounded-lg text-white/40 hover:text-blue-400 hover:bg-blue-500/20 transition-all" title="复制链接">
                        {copiedId === share.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteShare(share.id); }} className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/20 transition-all" title="删除分享">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-sm">
                    <span className={`flex items-center gap-1 ${isExpired(share.expires_at) ? 'text-red-400' : 'text-white/50'}`}>
                      <Clock className="w-4 h-4" />
                      {isExpired(share.expires_at) ? '已过期' : formatDate(share.expires_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Upload files panel */}
        {selectedShare && (
          <div className="w-80 bg-white/5 rounded-xl border border-white/10 p-4">
            <h3 className="text-white font-medium mb-4">上传的文件</h3>
            {uploadFiles.length === 0 ? (
              <p className="text-white/40 text-sm text-center py-8">暂无上传文件</p>
            ) : (
              <div className="space-y-2">
                {uploadFiles.map(file => (
                  <div key={file.id} className={`flex items-center gap-3 p-3 rounded-xl ${file.saved ? 'bg-green-500/10 border border-green-500/20' : 'bg-white/5'}`}>
                    <File className="w-5 h-5 text-white/40" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{file.filename}</p>
                      <p className="text-white/40 text-xs">{formatSize(file.size)}</p>
                    </div>
                    {!file.saved && (
                      <button
                        onClick={() => saveFile(file)}
                        disabled={savingFileId === file.id}
                        className="p-2 rounded-lg text-white/40 hover:text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50"
                        title="保存到我的文件"
                      >
                        {savingFileId === file.id ? (
                          <div className="w-4 h-4 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {file.saved && (
                      <span className="text-green-400 text-xs">已保存</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}