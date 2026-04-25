'use client';

import { useState, useEffect } from 'react';
import { Upload, File, Clock, AlertCircle, Cloud, Check } from 'lucide-react';

interface UploadShareInfo {
  id: string;
  share_code: string;
  name: string;
  expires_at: string;
}

function formatSize(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function UploadSharePage({ params }: { params: Promise<{ code: string }> }) {
  const [shareCode, setShareCode] = useState('');
  const [shareInfo, setShareInfo] = useState<UploadShareInfo | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  useEffect(() => {
    params.then(p => {
      setShareCode(p.code);
      fetchShareInfo(p.code);
    });
  }, []);

  async function fetchShareInfo(code: string) {
    try {
      const res = await fetch(`/api/upload-share/${code}`);
      if (res.ok) {
        const data = await res.json();
        setShareInfo(data.share);
        setUploadedFiles(data.files || []);
      } else {
        setError('分享不存在或已过期');
      }
    } catch {
      setError('获取分享信息失败');
    }
    setLoading(false);
  }

  async function handleUpload(files: FileList) {
    if (!shareInfo) return;
    setUploading(true);
    setUploadSuccess(false);
    let successCount = 0;
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_share_id', shareInfo.id);
      try {
        const res = await fetch('/api/upload-share/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          successCount++;
        }
      } catch {}
    }
    setUploading(false);
    if (successCount > 0) {
      setUploadSuccess(true);
      fetchShareInfo(shareCode);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !shareInfo) {
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

  const isExpired = new Date(shareInfo.expires_at) < new Date();

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center max-w-md">
          <Clock className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">分享已过期</h2>
          <p className="text-white/50">此上传分享链接已过期，无法继续上传</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl max-w-md w-full">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center">
            <Cloud className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-white text-center mb-2">{shareInfo.name}</h2>
        <p className="text-white/50 text-center mb-6 flex items-center justify-center gap-2">
          <Clock className="w-4 h-4" />
          有效期至 {new Date(shareInfo.expires_at).toLocaleString('zh-CN')}
        </p>

        {uploadSuccess && (
          <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-2">
            <Check className="w-5 h-5 text-green-400" />
            <span className="text-green-400 text-sm">文件上传成功</span>
          </div>
        )}

        <label className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium cursor-pointer transition-all">
          <Upload className="w-5 h-5" />
          {uploading ? '上传中...' : '选择文件上传'}
          <input
            type="file"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
            disabled={uploading}
          />
        </label>

        {uploadedFiles.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white/70 text-sm mb-3">已上传的文件</h3>
            <div className="space-y-2">
              {uploadedFiles.map((file: any) => (
                <div key={file.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <File className="w-5 h-5 text-white/40" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{file.filename}</p>
                    <p className="text-white/40 text-xs">{formatSize(file.size)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}