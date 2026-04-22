'use client';

import { useState } from 'react';
import { X, Copy, Check, Link, Lock } from 'lucide-react';

interface FileInfo {
  id: string;
  oss_key: string;
  filename: string;
  size: number;
  type: string;
}

interface ShareDialogProps {
  file: FileInfo;
  token: string;
  onClose: () => void;
}

export default function ShareDialog({ file, token, onClose }: ShareDialogProps) {
  const [expires, setExpires] = useState('1d');
  const [passwordProtected, setPasswordProtected] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(false);

  const expiresOptions = [
    { label: '1 小时', value: '1h' },
    { label: '6 小时', value: '6h' },
    { label: '1 天', value: '1d' },
    { label: '7 天', value: '7d' },
    { label: '30 天', value: '30d' },
  ];

  function getExpiresHours(value: string): number {
    const map: Record<string, number> = { '1h': 1, '6h': 6, '1d': 24, '7d': 168, '30d': 720 };
    return map[value] || 24;
  }

  async function createShare() {
    setCreating(true);
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_id: file.id,
          expires_hours: getExpiresHours(expires),
          is_password_protected: passwordProtected,
          password: passwordProtected ? sharePassword : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareLink(`${window.location.origin}/share/${data.shareCode}`);
      }
    } catch (err) {
      console.error(err);
    }
    setCreating(false);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/40 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold text-white mb-1">分享文件</h2>
        <p className="text-white/50 text-sm mb-6">{file.filename}</p>

        {!shareLink ? (
          <>
            <div className="mb-4">
              <label className="text-white/70 text-sm mb-2 block">过期时间</label>
              <div className="flex gap-2">
                {expiresOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setExpires(opt.value)}
                    className={`px-3 py-2 rounded-lg text-sm transition-all ${
                      expires === opt.value
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-10 h-6 rounded-full transition-all ${passwordProtected ? 'bg-blue-500' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${passwordProtected ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
                <span className="text-white/70 text-sm">密码保护</span>
                {passwordProtected && <Lock className="w-4 h-4 text-blue-400" />}
              </label>
              {passwordProtected && (
                <input
                  type="text"
                  value={sharePassword}
                  onChange={(e) => setSharePassword(e.target.value)}
                  placeholder="设置访问密码"
                  className="mt-3 w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-white placeholder-white/40 focus:outline-none focus:border-blue-400 transition-all"
                />
              )}
            </div>

            <button
              onClick={createShare}
              disabled={creating || (passwordProtected && !sharePassword)}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2"
            >
              <Link className="w-4 h-4" />
              {creating ? '创建中...' : '创建分享链接'}
            </button>
          </>
        ) : (
          <>
            <div className="bg-white/10 rounded-xl p-4 mb-4">
              <p className="text-white/70 text-sm mb-2">分享链接</p>
              <p className="text-blue-400 text-sm break-all">{shareLink}</p>
              {passwordProtected && (
                <p className="text-white/50 text-xs mt-2">访问密码: {sharePassword}</p>
              )}
            </div>

            <button
              onClick={copyLink}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-2"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制链接'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}